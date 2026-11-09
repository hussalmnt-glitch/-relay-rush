#!/usr/bin/env node
/**
 * End-to-end public deployment smoke test for Relay Rush.
 * Creates a temporary 2-seat human+agent match, advances it using END_TURN,
 * and verifies both authenticated APIs plus idempotent move retries.
 *
 * Usage:
 *   node scripts/smoke-test.mjs https://your-service.onrender.com
 */
import { randomUUID } from 'node:crypto';

const rawBase = process.argv[2];
if (!rawBase) {
  console.error('Usage: node scripts/smoke-test.mjs https://your-service.onrender.com');
  process.exit(2);
}

let base;
try {
  base = new URL(rawBase);
} catch {
  console.error('Please provide a valid base URL.');
  process.exit(2);
}
if (!['https:', 'http:'].includes(base.protocol)) {
  console.error('Base URL must use HTTPS (HTTP is allowed only for local development).');
  process.exit(2);
}
if (base.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(base.hostname)) {
  console.error('A public deployment must use HTTPS.');
  process.exit(2);
}
base.pathname = base.pathname.replace(/\/$/, '');
base.search = '';
base.hash = '';

const timeout = 90_000;
async function api(method, pathname, { body, token } = {}) {
  const response = await fetch(new URL(`${base.pathname}${pathname}`, base.origin), {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; }
  catch { throw new Error(`${method} ${pathname}: expected JSON, received HTTP ${response.status}`); }
  if (!response.ok) {
    throw new Error(`${method} ${pathname}: HTTP ${response.status} ${data?.error?.code || ''} ${data?.error?.message || ''}`.trim());
  }
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`Relay Rush deployment check: ${base.origin}`);

  const health = await api('GET', '/api/health');
  assert(health?.ok === true, 'Health check did not return ok=true.');
  assert(typeof health.version === 'string', 'Health response is missing the version.');
  console.log(`PASS health endpoint (version ${health.version})`);

  const pageResponse = await fetch(base, { signal: AbortSignal.timeout(timeout) });
  const page = await pageResponse.text();
  assert(pageResponse.ok, `Home page returned HTTP ${pageResponse.status}.`);
  assert(/<!doctype html|<html/i.test(page), 'Home page did not return HTML.');
  console.log('PASS public game page');

  const created = await api('POST', '/api/matches', {
    body: { name: 'Smoke Test Host', maxPlayers: 2 },
  });
  assert(created.code && created.hostToken && created.playerToken, 'Create match response is incomplete.');
  const code = created.code;
  const hostToken = created.hostToken;
  const hostPlayerToken = created.playerToken;
  console.log('PASS create match');

  const agent = await api('POST', `/api/agent/matches/${code}/join`, {
    body: { name: 'Smoke Test Agent' },
  });
  assert(agent.playerToken && agent.playerId, 'Agent join response is incomplete.');
  const agentToken = agent.playerToken;
  console.log('PASS external agent join');

  const started = await api('POST', `/api/matches/${code}/start`, {
    body: { hostToken, fillWithBots: false },
  });
  assert(started.phase === 'playing' && started.players?.length === 2, 'Match did not start with two seats.');
  console.log('PASS start mixed human/agent match');

  let actions = 0;
  let retriesChecked = false;
  for (; actions < 30; actions += 1) {
    const hostState = await api('GET', `/api/matches/${code}/state`, { token: hostPlayerToken });
    const agentState = await api('GET', `/api/agent/matches/${code}/state`, { token: agentToken });

    if (hostState.phase === 'finished' || agentState.phase === 'finished') break;

    let selected;
    if (hostState.isYourTurn) {
      selected = {
        route: `/api/matches/${code}/action`,
        token: hostPlayerToken,
        state: hostState,
        label: 'human',
      };
    } else if (agentState.isYourTurn) {
      selected = {
        route: `/api/agent/matches/${code}/moves`,
        token: agentToken,
        state: agentState,
        label: 'agent',
      };
    } else {
      await new Promise(resolve => setTimeout(resolve, 250));
      continue;
    }

    const endTurn = selected.state.legalActions?.find(action => action.type === 'END_TURN');
    assert(endTurn, `The ${selected.label} state did not advertise END_TURN.`);
    const body = {
      turnId: selected.state.turnId,
      requestId: randomUUID(),
      action: endTurn,
    };
    const result = await api('POST', selected.route, { token: selected.token, body });
    assert(result.ok === true, `The ${selected.label} move was not accepted.`);

    if (!retriesChecked && selected.label === 'agent') {
      const retry = await api('POST', selected.route, { token: selected.token, body });
      assert(retry.duplicate === true, 'Repeated requestId was not handled idempotently.');
      retriesChecked = true;
    }
  }

  assert(retriesChecked, 'The agent move endpoint and idempotent retry were not exercised.');
  const finalPublic = await api('GET', `/api/matches/${code}`);
  assert(finalPublic.phase === 'finished', `Smoke match did not finish; current phase is ${finalPublic.phase}.`);
  const events = await api('GET', `/api/matches/${code}/events`);
  assert(Array.isArray(events.events) && events.events.length > 0, 'Match event log is missing.');
  console.log(`PASS authenticated human+agent move APIs (${actions} turns checked)`);
  console.log('PASS requestId idempotency');
  console.log(`PASS match completion and event log (${events.events.length} events)`);
  console.log('ALL CHECKS PASSED');
}

main().catch(error => {
  console.error(`SMOKE TEST FAILED: ${error.message}`);
  process.exitCode = 1;
});
