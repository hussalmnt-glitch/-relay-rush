import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { chooseBotAction } from '../src/shared/game.mjs';

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
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function call(base, route, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${data.error?.message || 'request failed'}`);
  return data;
}

test('the included sample bot joins through HTTP and completes a mixed match', { timeout: 30_000 }, async (t) => {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'relay-rush-bot-'));
  const server = spawn(process.execPath, ['src/server/server.mjs'], {
    cwd: path.resolve(new URL('..', import.meta.url).pathname),
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir },
    stdio: 'ignore',
  });
  let bot;
  t.after(async () => {
    bot?.kill('SIGTERM');
    server.kill('SIGTERM');
    await wait(120);
    await rm(dataDir, { recursive: true, force: true });
  });
  let ready = false;
  for (let i = 0; i < 60; i += 1) {
    try { await call(base, '/api/health'); ready = true; break; } catch { await wait(100); }
  }
  assert.equal(ready, true, 'server should be ready');

  const created = await call(base, '/api/matches', { method: 'POST', body: { name: 'Human Host', maxPlayers: 3 } });
  bot = spawn(process.execPath, ['bot/sample-bot.mjs', '--url', base, '--code', created.code, '--name', 'External Sample Bot'], {
    cwd: path.resolve(new URL('..', import.meta.url).pathname),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let botOutput = '';
  bot.stdout.on('data', (chunk) => { botOutput += chunk.toString(); });
  bot.stderr.on('data', (chunk) => { botOutput += chunk.toString(); });
  let joined = false;
  for (let i = 0; i < 60; i += 1) {
    if (botOutput.includes('Joined')) { joined = true; break; }
    await wait(100);
  }
  assert.equal(joined, true, `sample bot should join; output: ${botOutput}`);
  await call(base, `/api/matches/${created.code}/start`, { method: 'POST', body: { hostToken: created.hostToken, fillWithBots: true } });

  let finished = false;
  for (let i = 0; i < 260; i += 1) {
    const state = await call(base, `/api/matches/${created.code}/state`, { token: created.playerToken });
    if (state.phase === 'finished') { finished = true; break; }
    if (state.isYourTurn) {
      const action = chooseBotAction(state, created.playerId);
      await call(base, `/api/matches/${created.code}/action`, {
        method: 'POST', token: created.playerToken,
        body: { action, turnId: state.turnId, requestId: `host-${i}` },
      });
    } else {
      await wait(80);
    }
  }
  assert.equal(finished, true, 'the mixed match should finish');
  for (let i = 0; i < 60 && bot.exitCode === null; i += 1) await wait(100);
  assert(botOutput.includes('Match complete'), `sample bot should report completion; output: ${botOutput}`);
});
