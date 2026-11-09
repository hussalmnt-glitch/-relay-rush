#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { chooseBotAction } from '../src/shared/game.mjs';

function args(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}
const options = args(process.argv);
const baseUrl = String(options.url || 'http://localhost:3000').replace(/\/$/, '');
const code = String(options.code || '').trim().toUpperCase();
const name = String(options.name || 'Sample Agent');
if (!code) {
  console.error('Usage: npm run bot -- --url http://localhost:3000 --code ABC123 [--name "Sample Agent"]');
  process.exit(2);
}

async function request(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${data.error?.code || 'ERROR'}: ${data.error?.message || 'Request failed'}`);
  return data;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  const joined = await request(`/api/agent/matches/${encodeURIComponent(code)}/join`, {
    method: 'POST', body: { name },
  });
  const auth = joined.playerToken;
  console.log(`Joined ${code} as ${joined.playerId} (${name}). Waiting for host…`);
  let lastTurn = -1;
  while (true) {
    const state = await request(`/api/agent/matches/${encodeURIComponent(code)}/state`, { token: auth });
    if (state.waiting) { await sleep(700); continue; }
    if (state.phase === 'finished') {
      const me = state.players.find((player) => player.id === joined.playerId);
      console.log(`Match complete. Your score: ${me?.score ?? 0}. Winners: ${state.winnerIds.join(', ') || 'shared draw'}.`);
      break;
    }
    if (state.isYourTurn) {
      const action = chooseBotAction(state, joined.playerId);
      const result = await request(`/api/agent/matches/${encodeURIComponent(code)}/moves`, {
        method: 'POST', token: auth,
        body: { action, turnId: state.turnId, requestId: randomUUID() },
      });
      if (lastTurn !== state.turnId) {
        lastTurn = state.turnId;
        console.log(`Round ${state.round}, turn ${state.turnId}: ${action.type}`);
      } else {
        console.log(`  ${action.type}`);
      }
      if (result.state?.phase === 'finished') continue;
      await sleep(250);
    } else {
      await sleep(500);
    }
  }
} catch (error) {
  console.error(`Sample bot failed: ${error.message}`);
  process.exitCode = 1;
}
