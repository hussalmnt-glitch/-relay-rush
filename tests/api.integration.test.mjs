import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}
async function json(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.token ? { authorization: `Bearer ${options.token}` } : {}), ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json();
  return { response, data };
}

test('HTTP API supports host, human/agent seats, bot-fill, authenticated moves and event log', async (t) => {
  const port = await freePort();
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'relay-rush-test-'));
  const child = spawn(process.execPath, ['src/server/server.mjs'], {
    cwd: path.resolve(new URL('..', import.meta.url).pathname),
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir },
    stdio: 'ignore',
  });
  t.after(async () => {
    child.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 100));
    await rm(dataDir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  let healthy = false;
  for (let i = 0; i < 60; i += 1) {
    try {
      const { response } = await json(`${base}/api/health`);
      if (response.ok) { healthy = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(healthy, true, 'server should start');
  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert((await home.text()).includes('Relay Rush'));
  const clientAsset = await fetch(`${base}/app.js`);
  assert.equal(clientAsset.status, 200);
  assert((await clientAsset.text()).includes('create-form'));
  const apiDocs = await json(`${base}/api/docs`);
  assert.equal(apiDocs.response.status, 200);
  assert(apiDocs.data.markdown.includes('legalActions'));

  const created = await json(`${base}/api/matches`, { method: 'POST', body: { name: 'Host', maxPlayers: 3 } });
  assert.equal(created.response.status, 201);
  const { code, playerToken: hostSeatToken, hostToken, playerId: hostId } = created.data;
  assert.equal(hostId, 'P1');
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);

  const joined = await json(`${base}/api/agent/matches/${code}/join`, { method: 'POST', body: { name: 'Agent Two' } });
  assert.equal(joined.response.status, 201);
  const agentToken = joined.data.playerToken;
  assert.equal(joined.data.playerId, 'P2');

  const started = await json(`${base}/api/matches/${code}/start`, { method: 'POST', body: { hostToken, fillWithBots: true } });
  assert.equal(started.response.status, 200);
  assert.equal(started.data.phase, 'playing');
  assert.equal(started.data.players.length, 3);
  assert.equal(started.data.players[2].kind, 'bot');
  const publicPayload = JSON.stringify(await (await fetch(`${base}/api/matches/${code}`)).json());
  assert(!publicPayload.includes(hostToken));
  assert(!publicPayload.includes(hostSeatToken));
  assert(!publicPayload.includes(agentToken));

  const noAuth = await json(`${base}/api/matches/${code}/state`);
  assert.equal(noAuth.response.status, 401);

  let hostState;
  let agentState;
  let activeSeat;
  for (let i = 0; i < 40; i += 1) {
    hostState = await json(`${base}/api/matches/${code}/state`, { token: hostSeatToken });
    agentState = await json(`${base}/api/agent/matches/${code}/state`, { token: agentToken });
    if (hostState.data.isYourTurn) { activeSeat = { id: 'P1', token: hostSeatToken, path: `/api/matches/${code}/action`, state: hostState.data }; break; }
    if (agentState.data.isYourTurn) { activeSeat = { id: 'P2', token: agentToken, path: `/api/agent/matches/${code}/moves`, state: agentState.data }; break; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(activeSeat, 'a human or agent seat should receive a turn after any opening bot turn');
  const badMove = await json(`${base}${activeSeat.path}`, {
    method: 'POST', token: activeSeat.token,
    body: { turnId: activeSeat.state.turnId, requestId: 'bad-move-0001', action: { type: 'MOVE', to: { x: 99, y: 99 } } },
  });
  assert.equal(badMove.response.status, 422);

  const action = activeSeat.state.legalActions.find((candidate) => candidate.type === 'MOVE');
  assert(action, 'active human/agent should have at least one legal move');
  const request = { turnId: activeSeat.state.turnId, requestId: 'move-once-0001', action };
  const move = await json(`${base}${activeSeat.path}`, { method: 'POST', token: activeSeat.token, body: request });
  assert.equal(move.response.status, 200);
  assert.deepEqual({
    x: move.data.state.players.find((player) => player.id === activeSeat.id).x,
    y: move.data.state.players.find((player) => player.id === activeSeat.id).y,
  }, action.to);

  const duplicate = await json(`${base}${activeSeat.path}`, { method: 'POST', token: activeSeat.token, body: request });
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.data.duplicate, true);

  const endTurn = await json(`${base}${activeSeat.path}`, {
    method: 'POST', token: activeSeat.token,
    body: { turnId: activeSeat.state.turnId, requestId: 'active-end-0001', action: { type: 'END_TURN' } },
  });
  assert.equal(endTurn.response.status, 200);
  const agentAfter = await json(`${base}/api/agent/matches/${code}/state`, { token: agentToken });
  if (activeSeat.id === 'P1') {
    assert.equal(agentAfter.data.isYourTurn, true);
    const agentEnd = await json(`${base}/api/agent/matches/${code}/moves`, {
      method: 'POST', token: agentToken,
      body: { turnId: agentAfter.data.turnId, requestId: 'agent-end-0001', action: { type: 'END_TURN' } },
    });
    assert.equal(agentEnd.response.status, 200);
  }

  const events = await json(`${base}/api/matches/${code}/events`);
  assert.equal(events.response.status, 200);
  assert(events.data.events.some((event) => event.type === 'PLAYER_MOVED'));
  assert(events.data.events.some((event) => event.type === 'MATCH_STARTED'));
});

test('request IDs are idempotent per seat without colliding across players', async (t) => {
  const port = await freePort();
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'relay-rush-idempotency-'));
  const child = spawn(process.execPath, ['src/server/server.mjs'], {
    cwd: path.resolve(new URL('..', import.meta.url).pathname),
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir },
    stdio: 'ignore',
  });
  t.after(async () => {
    child.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 100));
    await rm(dataDir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 60; i += 1) {
    try { const { response } = await json(`${base}/api/health`); if (response.ok) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(ready, true);
  const created = await json(`${base}/api/matches`, { method: 'POST', body: { name: 'Human One', maxPlayers: 2 } });
  const { code, playerToken: hostToken, hostToken: startToken } = created.data;
  const joined = await json(`${base}/api/agent/matches/${code}/join`, { method: 'POST', body: { name: 'Agent Two' } });
  await json(`${base}/api/matches/${code}/start`, { method: 'POST', body: { hostToken: startToken, fillWithBots: false } });

  const hostState = await json(`${base}/api/matches/${code}/state`, { token: hostToken });
  const agentState = await json(`${base}/api/agent/matches/${code}/state`, { token: joined.data.playerToken });
  const active = hostState.data.isYourTurn
    ? { token: hostToken, state: hostState.data, path: `/api/matches/${code}/action` }
    : { token: joined.data.playerToken, state: agentState.data, path: `/api/agent/matches/${code}/moves` };
  const other = hostState.data.isYourTurn
    ? { token: joined.data.playerToken, path: `/api/agent/matches/${code}/state`, movePath: `/api/agent/matches/${code}/moves` }
    : { token: hostToken, path: `/api/matches/${code}/state`, movePath: `/api/matches/${code}/action` };
  const first = await json(`${base}${active.path}`, {
    method: 'POST', token: active.token,
    body: { turnId: active.state.turnId, requestId: 'same-id-from-two-seats', action: { type: 'END_TURN' } },
  });
  assert.equal(first.response.status, 200);
  const otherState = await json(`${base}${other.path}`, { token: other.token });
  assert.equal(otherState.data.isYourTurn, true);
  const second = await json(`${base}${other.movePath}`, {
    method: 'POST', token: other.token,
    body: { turnId: otherState.data.turnId, requestId: 'same-id-from-two-seats', action: { type: 'END_TURN' } },
  });
  assert.equal(second.response.status, 200);
  assert.equal(second.data.duplicate, undefined);
});
