import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  GAME, createInitialGame, publicState, buildAgentState, applyGameAction,
  forceEndTurn, chooseBotAction, getCurrentPlayer,
} from '../shared/game.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PUBLIC_DIR = path.join(ROOT, 'src/client');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'matches.json');
const PORT = Number(process.env.PORT || 3000);
const VERSION = '1.0.0';
const matches = new Map();
const rateBuckets = new Map();
let persistQueue = Promise.resolve();
let persistenceWarning = null;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon',
};

function token() { return randomBytes(32).toString('base64url'); }
function matchCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) code += alphabet[randomBytes(1)[0] % alphabet.length];
  return code;
}
function playerId(index) { return `P${index + 1}`; }
function cleanName(value) {
  if (typeof value !== 'string') throw apiError(400, 'INVALID_NAME', 'Name must be text.');
  const name = value.trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, 18);
  if (name.length < 1) throw apiError(400, 'INVALID_NAME', 'Name must contain 1–18 visible characters.');
  return name;
}
function apiError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function findMatch(code) {
  const match = matches.get(String(code || '').toUpperCase());
  if (!match) throw apiError(404, 'MATCH_NOT_FOUND', 'No match exists with that code.');
  return match;
}
function publicMatch(match) {
  return {
    code: match.code,
    phase: match.game?.phase || match.phase,
    maxPlayers: match.maxPlayers,
    createdAt: match.createdAt,
    startedAt: match.startedAt,
    players: match.players.map(({ id, name, kind, seat }) => ({ id, name, kind, seat })),
    game: match.game ? publicState(match.game) : null,
  };
}
function bearer(req) {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}
function authenticate(match, req) {
  const supplied = bearer(req);
  const seat = match.players.find((player) => safeEqual(player.authToken, supplied));
  if (!seat) throw apiError(401, 'UNAUTHORIZED', 'A valid seat token is required.');
  return seat;
}
async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32 * 1024) throw apiError(413, 'BODY_TOO_LARGE', 'Request body exceeds 32 KB.');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw apiError(400, 'INVALID_JSON', 'Request body must be valid JSON.'); }
}
function send(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    ...headers,
  });
  res.end(body);
}
function sendError(res, error) {
  const status = Number(error.status) || 500;
  if (status >= 500) console.error('[server-error]', error);
  send(res, status, {
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: status >= 500 ? 'An unexpected server error occurred.' : error.message,
    },
  });
}
async function persist() {
  const snapshot = JSON.stringify([...matches.values()]);
  persistQueue = persistQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const temporary = `${DATA_FILE}.tmp`;
    await fs.writeFile(temporary, snapshot, { mode: 0o600 });
    await fs.rename(temporary, DATA_FILE);
    persistenceWarning = null;
  }).catch((error) => {
    persistenceWarning = error.message;
    console.error('[persistence-warning]', error.message);
  });
  return persistQueue;
}
async function loadMatches() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const saved = JSON.parse(raw);
    if (Array.isArray(saved)) for (const match of saved) matches.set(match.code, match);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[persistence-load-warning]', error.message);
  }
}
function newSeat(name, kind, seat) {
  return { id: playerId(seat), name, kind, seat, authToken: token() };
}
function findPlayerGame(match, seatId) {
  return match.game?.players.find((player) => player.id === seatId) ?? null;
}
function stateResponse(match, seat) {
  if (!match.game) throw apiError(409, 'MATCH_NOT_STARTED', 'The host has not started this match yet.');
  const state = buildAgentState(match.game, seat.id);
  state.matchCode = match.code;
  return state;
}
function createMatch(body) {
  const name = cleanName(body.name || 'Commander');
  const maxPlayers = Number(body.maxPlayers ?? 4);
  if (!Number.isInteger(maxPlayers) || maxPlayers < GAME.minPlayers || maxPlayers > GAME.maxPlayers) {
    throw apiError(400, 'INVALID_PLAYER_COUNT', 'maxPlayers must be 2, 3, or 4.');
  }
  let code;
  do { code = matchCode(); } while (matches.has(code));
  const host = newSeat(name, 'human', 0);
  const hostToken = token();
  const match = {
    code, phase: 'lobby', maxPlayers, hostSeatId: host.id, hostToken,
    createdAt: Date.now(), startedAt: null, players: [host], game: null,
    processedRequests: {}, botNextAt: 0,
  };
  matches.set(code, match);
  return { match, host, hostToken };
}
function addSeat(match, name, kind) {
  if (match.phase !== 'lobby') throw apiError(409, 'MATCH_ALREADY_STARTED', 'This match has already started.');
  if (match.players.length >= match.maxPlayers) throw apiError(409, 'MATCH_FULL', 'This match has no empty seats.');
  const seat = newSeat(cleanName(name), kind, match.players.length);
  match.players.push(seat);
  return seat;
}
function startMatch(match, hostToken, fillWithBots) {
  if (!safeEqual(match.hostToken, hostToken)) throw apiError(403, 'HOST_ONLY', 'Only the match host can start the match.');
  if (match.phase !== 'lobby') throw apiError(409, 'MATCH_ALREADY_STARTED', 'This match has already started.');
  if (fillWithBots === true) {
    while (match.players.length < match.maxPlayers) {
      const index = match.players.length;
      addSeat(match, `Relay Bot ${index}`, 'bot');
    }
  }
  if (match.players.length < GAME.minPlayers) {
    throw apiError(409, 'NOT_ENOUGH_PLAYERS', 'At least two seats are required. Invite a player or fill an empty seat with a bot.');
  }
  const spawnOffset = match.code.charCodeAt(0) % 4;
  const firstPlayerOffset = match.code.charCodeAt(1) % match.players.length;
  const spawnPermutationSeed = Number.parseInt(match.code.slice(1, 5), 36) || 1;
  match.game = createInitialGame(match.players, { now: Date.now(), spawnOffset, firstPlayerOffset, spawnPermutationSeed });
  match.phase = 'playing';
  match.startedAt = Date.now();
  return match;
}
function submitAction(match, seat, body) {
  if (match.phase !== 'playing' || !match.game) throw apiError(409, 'MATCH_NOT_ACTIVE', 'This match is not active.');
  if (!findPlayerGame(match, seat.id)) throw apiError(403, 'SEAT_NOT_IN_GAME', 'This seat is not part of the active match.');
  const requestId = typeof body.requestId === 'string' ? body.requestId.slice(0, 100) : '';
  if (!requestId) throw apiError(400, 'REQUEST_ID_REQUIRED', 'requestId is required for idempotency.');
  const requestKey = `${seat.id}:${requestId}`;
  const previous = match.processedRequests[requestKey];
  if (previous) return { ...previous, duplicate: true };
  if (!Number.isInteger(body.turnId) || body.turnId !== match.game.turnId) {
    throw apiError(409, 'STALE_TURN', 'The turn has changed. Fetch the latest game state and try again.');
  }
  if (match.game.currentPlayerId !== seat.id) throw apiError(409, 'NOT_YOUR_TURN', 'It is not your turn.');
  try {
    applyGameAction(match.game, seat.id, body.action, { now: Date.now() });
  } catch (error) {
    const status = error.code === 'NOT_YOUR_TURN' ? 409 : 422;
    throw apiError(status, error.code || 'ILLEGAL_ACTION', error.message);
  }
  if (match.game.phase === 'finished') match.phase = 'finished';
  const result = { ok: true, state: stateResponse(match, seat) };
  match.processedRequests[requestKey] = result;
  const requestKeys = Object.keys(match.processedRequests);
  if (requestKeys.length > 300) delete match.processedRequests[requestKeys[0]];
  return result;
}
function checkRateLimit(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || { start: now, count: 0 };
  if (now - bucket.start > 60_000) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  if (bucket.count > 600) throw apiError(429, 'RATE_LIMITED', 'Too many requests. Please slow down.');
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean);
  const method = req.method;
  if (method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, { ok: true, version: VERSION, activeMatches: matches.size, persistenceWarning });
  }
  if (method === 'GET' && url.pathname === '/api/docs') {
    const content = await fs.readFile(path.join(ROOT, 'docs/API.md'), 'utf8');
    return send(res, 200, { markdown: content });
  }
  if (method === 'POST' && url.pathname === '/api/matches') {
    const body = await readJson(req);
    const { match, host, hostToken } = createMatch(body);
    await persist();
    return send(res, 201, {
      code: match.code,
      playerToken: host.authToken,
      hostToken,
      playerId: host.id,
      match: publicMatch(match),
    });
  }
  if (parts[0] === 'api' && parts[1] === 'matches' && parts[2]) {
    const match = findMatch(parts[2]);
    if (method === 'GET' && parts.length === 3) return send(res, 200, publicMatch(match));
    if (method === 'POST' && parts[3] === 'join') {
      const body = await readJson(req);
      const seat = addSeat(match, body.name || 'Commander', 'human');
      await persist();
      return send(res, 201, { code: match.code, playerToken: seat.authToken, playerId: seat.id, match: publicMatch(match) });
    }
    if (method === 'POST' && parts[3] === 'start') {
      const body = await readJson(req);
      startMatch(match, body.hostToken, body.fillWithBots === true);
      await persist();
      return send(res, 200, publicMatch(match));
    }
    if (method === 'GET' && parts[3] === 'events') {
      if (!match.game) return send(res, 200, { code: match.code, events: [] });
      return send(res, 200, { code: match.code, events: match.game.events });
    }
    if (method === 'GET' && parts[3] === 'state') {
      const seat = authenticate(match, req);
      if (!match.game) return send(res, 200, { match: publicMatch(match), waiting: true, you: seat.id });
      return send(res, 200, stateResponse(match, seat));
    }
    if (method === 'POST' && parts[3] === 'action') {
      const seat = authenticate(match, req);
      const body = await readJson(req);
      const result = submitAction(match, seat, body);
      await persist();
      return send(res, 200, result);
    }
  }
  if (parts[0] === 'api' && parts[1] === 'agent' && parts[2] === 'matches' && parts[3]) {
    const match = findMatch(parts[3]);
    if (method === 'POST' && parts[4] === 'join') {
      const body = await readJson(req);
      const seat = addSeat(match, body.name || 'Strategy Agent', 'agent');
      await persist();
      return send(res, 201, { code: match.code, playerToken: seat.authToken, playerId: seat.id, match: publicMatch(match) });
    }
    if (method === 'GET' && parts[4] === 'state') {
      const seat = authenticate(match, req);
      if (seat.kind === 'bot') throw apiError(403, 'BOT_SEAT', 'Built-in bot seats are controlled by the server.');
      if (!match.game) return send(res, 200, { waiting: true, match: publicMatch(match), you: seat.id });
      return send(res, 200, stateResponse(match, seat));
    }
    if (method === 'POST' && parts[4] === 'moves') {
      const seat = authenticate(match, req);
      if (seat.kind === 'bot') throw apiError(403, 'BOT_SEAT', 'Built-in bot seats are controlled by the server.');
      const body = await readJson(req);
      const result = submitAction(match, seat, body);
      await persist();
      return send(res, 200, result);
    }
  }
  throw apiError(404, 'ROUTE_NOT_FOUND', 'No API route matches this request.');
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const target = path.resolve(PUBLIC_DIR, `.${pathname}`);
  if (!target.startsWith(PUBLIC_DIR + path.sep) && target !== path.join(PUBLIC_DIR, 'index.html')) {
    throw apiError(403, 'PATH_FORBIDDEN', 'Path is not allowed.');
  }
  let file = target;
  try {
    const stat = await fs.stat(file);
    if (stat.isDirectory()) file = path.join(file, 'index.html');
    const data = await fs.readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': path.basename(file) === 'index.html' ? 'no-cache' : 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    });
    res.end(data);
  } catch (error) {
    if (error.code === 'ENOENT') throw apiError(404, 'FILE_NOT_FOUND', 'File not found.');
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    checkRateLimit(req);
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') throw apiError(405, 'METHOD_NOT_ALLOWED', 'Only GET and HEAD are allowed for static files.');
    return await serveStatic(req, res, url);
  } catch (error) {
    if (!res.headersSent) sendError(res, error);
    else res.destroy();
  }
});

let botBusy = false;
const timer = setInterval(async () => {
  if (botBusy) return;
  botBusy = true;
  try {
    const now = Date.now();
    for (const match of matches.values()) {
      if (match.phase !== 'playing' || !match.game) continue;
      const current = getCurrentPlayer(match.game);
      if (!current) continue;
      if (current.kind === 'bot') {
        if (now < (match.botNextAt || 0)) continue;
        const action = chooseBotAction(match.game, current.id);
        try {
          applyGameAction(match.game, current.id, action, { now });
          if (match.game.phase === 'finished') match.phase = 'finished';
          match.botNextAt = Date.now() + 450;
          await persist();
        } catch (error) {
          console.error('[bot-action-error]', error.message);
          forceEndTurn(match.game, 'bot_error', now);
          await persist();
        }
      } else if (now >= match.game.turnDeadline) {
        forceEndTurn(match.game, 'timeout', now);
        if (match.game.phase === 'finished') match.phase = 'finished';
        await persist();
      }
    }
  } finally {
    botBusy = false;
  }
}, 350);

timer.unref();

await loadMatches();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Relay Rush ${VERSION} listening on http://0.0.0.0:${PORT}`);
  console.log(`Loaded ${matches.size} saved match(es). Data directory: ${DATA_DIR}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    clearInterval(timer);
    await persist();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
