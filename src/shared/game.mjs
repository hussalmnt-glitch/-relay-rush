export const GAME = Object.freeze({
  title: 'Relay Rush',
  boardSize: 7,
  rounds: 6,
  actionPoints: 2,
  turnSeconds: 20,
  maxPlayers: 4,
  minPlayers: 2,
  maxPulses: 2,
  startingPulses: 1,
  rechargeAfterRounds: [2, 4],
  relays: [
    { id: 'north', x: 3, y: 1, value: 1, label: 'North Relay' },
    { id: 'east', x: 5, y: 3, value: 1, label: 'East Relay' },
    { id: 'south', x: 3, y: 5, value: 1, label: 'South Relay' },
    { id: 'west', x: 1, y: 3, value: 1, label: 'West Relay' },
    { id: 'core', x: 3, y: 3, value: 2, label: 'Core Relay' },
  ],
  spawns: [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 6, y: 6 },
    { x: 0, y: 6 },
  ],
  colors: ['#66e3c4', '#ffbd69', '#a78bfa', '#fb7185'],
});

export const DIRECTIONS = Object.freeze([
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]);

export function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function relayAt(x, y) {
  return GAME.relays.find((relay) => relay.x === x && relay.y === y) ?? null;
}

export function createInitialGame(players, options = {}) {
  if (!Array.isArray(players) || players.length < GAME.minPlayers || players.length > GAME.maxPlayers) {
    throw new Error(`A match requires ${GAME.minPlayers}-${GAME.maxPlayers} players.`);
  }
  const spawnCells = spawnOrder(players.length, options.spawnOffset ?? 0);
  const assignment = permuteIndexes(players.length, options.spawnPermutationSeed);
  const spawns = assignment.map((index) => spawnCells[index]);
  const now = options.now ?? Date.now();
  const ids = players.map((player) => player.id);
  const firstOffset = ((Number(options.firstPlayerOffset ?? options.spawnOffset ?? 0) || 0) % ids.length + ids.length) % ids.length;
  const turnOrder = [...ids.slice(firstOffset), ...ids.slice(0, firstOffset)];
  const match = {
    phase: 'playing',
    round: 1,
    turnOrder,
    turnIndex: 0,
    currentPlayerId: turnOrder[0],
    actionPoints: GAME.actionPoints,
    turnId: 1,
    turnDeadline: now + GAME.turnSeconds * 1000,
    startedAt: now,
    finishedAt: null,
    players: players.map((player, index) => ({
      id: player.id,
      name: player.name,
      kind: player.kind ?? 'human',
      color: GAME.colors[index],
      x: spawns[index].x,
      y: spawns[index].y,
      score: 0,
      pulses: GAME.startingPulses,
      relaysOwned: 0,
    })),
    relays: GAME.relays.map((relay) => ({ ...relay, ownerId: null, jammedRound: null })),
    events: [],
    winnerIds: [],
    draw: false,
    roundsCompleted: 0,
  };
  addEvent(match, 'MATCH_STARTED', { playerCount: players.length, firstPlayerId: match.currentPlayerId });
  addEvent(match, 'TURN_STARTED', { playerId: match.currentPlayerId, round: 1, turnId: 1 });
  return match;
}

function spawnOrder(count, offset = 0) {
  const start = ((Number(offset) || 0) % GAME.spawns.length + GAME.spawns.length) % GAME.spawns.length;
  if (count === 2) return [GAME.spawns[start], GAME.spawns[(start + 2) % 4]];
  if (count === 3) return [GAME.spawns[start], GAME.spawns[(start + 1) % 4], GAME.spawns[(start + 2) % 4]];
  return Array.from({ length: 4 }, (_, index) => GAME.spawns[(start + index) % 4]);
}


function permuteIndexes(count, seed) {
  const indexes = Array.from({ length: count }, (_, index) => index);
  if (seed === undefined || seed === null) return indexes;
  let value = (Math.abs(Number(seed)) || 1) % 2147483647;
  if (value === 0) value = 1;
  for (let index = count - 1; index > 0; index -= 1) {
    value = (value * 48271) % 2147483647;
    const swap = value % (index + 1);
    [indexes[index], indexes[swap]] = [indexes[swap], indexes[index]];
  }
  return indexes;
}

export function addEvent(match, type, data = {}, at = Date.now()) {
  const event = {
    seq: match.events.length + 1,
    type,
    round: match.round,
    turnId: match.turnId,
    at,
    ...data,
  };
  match.events.push(event);
  return event;
}

export function getPlayer(match, playerId) {
  return match.players.find((player) => player.id === playerId) ?? null;
}

export function getCurrentPlayer(match) {
  return getPlayer(match, match.currentPlayerId);
}

export function legalActions(match, playerId = match.currentPlayerId) {
  if (match.phase !== 'playing' || playerId !== match.currentPlayerId) return [];
  const player = getPlayer(match, playerId);
  if (!player) return [];
  const actions = [];
  for (const direction of DIRECTIONS) {
    const x = player.x + direction.x;
    const y = player.y + direction.y;
    if (!inBounds(x, y) || relayAt(x, y)) continue;
    if (match.players.some((other) => other.id !== playerId && other.x === x && other.y === y)) continue;
    actions.push({ type: 'MOVE', to: { x, y } });
  }
  for (const relay of match.relays) {
    if (relay.ownerId !== playerId && manhattan(player, relay) === 1) {
      actions.push({ type: 'CLAIM', relayId: relay.id });
    }
    if (
      relay.ownerId && relay.ownerId !== playerId &&
      manhattan(player, relay) <= 2 && relay.jammedRound !== match.round && player.pulses > 0
    ) {
      actions.push({ type: 'JAM', relayId: relay.id });
    }
  }
  actions.push({ type: 'END_TURN' });
  return actions;
}

export function applyGameAction(match, playerId, action, options = {}) {
  const now = options.now ?? Date.now();
  if (match.phase !== 'playing') throw gameError('MATCH_FINISHED', 'This match is not active.');
  if (playerId !== match.currentPlayerId) throw gameError('NOT_YOUR_TURN', 'It is not your turn.');
  const player = getPlayer(match, playerId);
  if (!player) throw gameError('PLAYER_NOT_FOUND', 'Player not found.');
  const allowed = legalActions(match, playerId);
  if (!allowed.some((candidate) => sameAction(candidate, action))) {
    throw gameError('ILLEGAL_ACTION', 'That action is not legal in the current state.');
  }

  if (action.type === 'END_TURN') {
    addEvent(match, 'TURN_ENDED', { playerId, reason: 'manual' }, now);
    advanceTurn(match, now);
    return match;
  }

  if (action.type === 'MOVE') {
    const from = { x: player.x, y: player.y };
    player.x = action.to.x;
    player.y = action.to.y;
    match.actionPoints -= 1;
    addEvent(match, 'PLAYER_MOVED', { playerId, from, to: { ...action.to } }, now);
  } else if (action.type === 'CLAIM') {
    const relay = match.relays.find((item) => item.id === action.relayId);
    const previousOwnerId = relay.ownerId;
    relay.ownerId = playerId;
    match.actionPoints -= 1;
    refreshRelayCounts(match);
    addEvent(match, 'RELAY_CLAIMED', { playerId, relayId: relay.id, previousOwnerId, value: relay.value }, now);
  } else if (action.type === 'JAM') {
    const relay = match.relays.find((item) => item.id === action.relayId);
    relay.jammedRound = match.round;
    player.pulses -= 1;
    match.actionPoints -= 1;
    addEvent(match, 'RELAY_JAMMED', { playerId, relayId: relay.id, ownerId: relay.ownerId }, now);
  }

  if (match.actionPoints <= 0) {
    addEvent(match, 'TURN_ENDED', { playerId, reason: 'no_action_points' }, now);
    advanceTurn(match, now);
  }
  return match;
}

export function forceEndTurn(match, reason = 'timeout', now = Date.now()) {
  if (match.phase !== 'playing') return match;
  const playerId = match.currentPlayerId;
  addEvent(match, 'TURN_ENDED', { playerId, reason }, now);
  advanceTurn(match, now);
  return match;
}

function advanceTurn(match, now) {
  match.actionPoints = GAME.actionPoints;
  match.turnIndex += 1;
  if (match.turnIndex >= match.turnOrder.length) {
    completeRound(match, now);
    return;
  }
  startTurn(match, now);
}

function completeRound(match, now) {
  const scoring = [];
  for (const relay of match.relays) {
    if (relay.ownerId && relay.jammedRound !== match.round) {
      const owner = getPlayer(match, relay.ownerId);
      if (owner) {
        owner.score += relay.value;
        scoring.push({ playerId: owner.id, relayId: relay.id, points: relay.value });
      }
    }
  }
  refreshRelayCounts(match);
  match.roundsCompleted = match.round;
  addEvent(match, 'ROUND_SCORED', { round: match.round, scoring, totals: scoreTable(match) }, now);
  for (const relay of match.relays) relay.jammedRound = null;
  if (GAME.rechargeAfterRounds.includes(match.round)) {
    for (const player of match.players) player.pulses = Math.min(GAME.maxPulses, player.pulses + 1);
    addEvent(match, 'PULSES_RECHARGED', { players: match.players.map((p) => ({ playerId: p.id, pulses: p.pulses })) }, now);
  }

  if (match.round >= GAME.rounds) {
    finishMatch(match, now);
    return;
  }

  match.round += 1;
  // Rotate the first player each round to reduce first-seat advantage.
  match.turnOrder = [...match.turnOrder.slice(1), match.turnOrder[0]];
  match.turnIndex = 0;
  match.actionPoints = GAME.actionPoints;
  match.turnId += 1;
  match.currentPlayerId = match.turnOrder[0];
  match.turnDeadline = now + GAME.turnSeconds * 1000;
  addEvent(match, 'ROUND_STARTED', { round: match.round, turnOrder: [...match.turnOrder] }, now);
  addEvent(match, 'TURN_STARTED', { playerId: match.currentPlayerId, round: match.round, turnId: match.turnId }, now);
}

function startTurn(match, now) {
  match.turnId += 1;
  match.currentPlayerId = match.turnOrder[match.turnIndex];
  match.turnDeadline = now + GAME.turnSeconds * 1000;
  addEvent(match, 'TURN_STARTED', { playerId: match.currentPlayerId, round: match.round, turnId: match.turnId }, now);
}

function finishMatch(match, now) {
  match.phase = 'finished';
  match.finishedAt = now;
  const bestScore = Math.max(...match.players.map((player) => player.score));
  let finalists = match.players.filter((player) => player.score === bestScore);
  if (finalists.length > 1) {
    const bestRelays = Math.max(...finalists.map((player) => player.relaysOwned));
    finalists = finalists.filter((player) => player.relaysOwned === bestRelays);
  }
  match.winnerIds = finalists.map((player) => player.id);
  match.draw = finalists.length > 1;
  addEvent(match, 'MATCH_FINISHED', {
    winnerIds: [...match.winnerIds],
    draw: match.draw,
    finalScores: scoreTable(match),
  }, now);
}

export function refreshRelayCounts(match) {
  for (const player of match.players) player.relaysOwned = match.relays.filter((relay) => relay.ownerId === player.id).length;
}

export function scoreTable(match) {
  return match.players
    .map((player) => ({ playerId: player.id, name: player.name, score: player.score, relaysOwned: player.relaysOwned }))
    .sort((a, b) => b.score - a.score || b.relaysOwned - a.relaysOwned);
}

export function publicState(match) {
  const state = structuredClone(match);
  delete state.hostToken;
  delete state.processedRequests;
  for (const player of state.players) delete player.authToken;
  return state;
}

export function buildAgentState(match, playerId) {
  const state = publicState(match);
  state.you = playerId;
  state.isYourTurn = match.currentPlayerId === playerId && match.phase === 'playing';
  state.legalActions = legalActions(match, playerId);
  state.actionPoints = match.currentPlayerId === playerId ? match.actionPoints : 0;
  return state;
}

export function chooseBotAction(match, playerId) {
  const player = getPlayer(match, playerId);
  const actions = legalActions(match, playerId);
  if (!player || !actions.length) return { type: 'END_TURN' };

  const claims = actions.filter((action) => action.type === 'CLAIM');
  if (claims.length) {
    claims.sort((a, b) => {
      const ra = match.relays.find((relay) => relay.id === a.relayId);
      const rb = match.relays.find((relay) => relay.id === b.relayId);
      const scoreA = (ra.value * 4) + (ra.ownerId ? 1.4 : 0) - (ra.jammedRound === match.round ? 2 : 0);
      const scoreB = (rb.value * 4) + (rb.ownerId ? 1.4 : 0) - (rb.jammedRound === match.round ? 2 : 0);
      return scoreB - scoreA;
    });
    return claims[0];
  }

  const opponents = match.players.filter((other) => other.id !== playerId);
  const jams = actions.filter((action) => action.type === 'JAM');
  if (jams.length) {
    const leaderScore = Math.max(...opponents.map((other) => other.score));
    const usefulJam = jams
      .map((action) => ({ action, relay: match.relays.find((relay) => relay.id === action.relayId) }))
      .filter(({ relay }) => relay && (getPlayer(match, relay.ownerId)?.score ?? 0) >= leaderScore - 1)
      .sort((a, b) => b.relay.value - a.relay.value);
    if (usefulJam.length && (usefulJam[0].relay.value === 2 || leaderScore >= player.score + 2)) return usefulJam[0].action;
  }

  const moves = actions.filter((action) => action.type === 'MOVE');
  if (!moves.length) return { type: 'END_TURN' };
  const targetRelays = match.relays
    .filter((relay) => relay.ownerId !== playerId)
    .map((relay) => {
      const distance = Math.min(...adjacentCells(relay).map((cell) => manhattan(player, cell)));
      const contestedBonus = relay.ownerId ? 0.35 : 0;
      const coreTimingBonus = relay.id === 'core' && match.round >= 3 ? 0.35 : 0;
      return { relay, distance, utility: relay.value * 1.25 - distance * 0.8 + contestedBonus + coreTimingBonus };
    })
    .sort((a, b) => b.utility - a.utility || a.distance - b.distance);
  const target = targetRelays[0]?.relay;
  if (!target) return { type: 'END_TURN' };
  moves.sort((a, b) => {
    const da = manhattan(a.to, target);
    const db = manhattan(b.to, target);
    return da - db || centerBias(a.to) - centerBias(b.to);
  });
  if (manhattan(moves[0].to, target) >= manhattan(player, target)) return { type: 'END_TURN' };
  return moves[0];
}

function adjacentCells(point) {
  return DIRECTIONS.map((direction) => ({ x: point.x + direction.x, y: point.y + direction.y }));
}
function centerBias(point) { return Math.abs(point.x - 3) + Math.abs(point.y - 3); }
function inBounds(x, y) { return x >= 0 && y >= 0 && x < GAME.boardSize && y < GAME.boardSize; }
function sameAction(a, b) {
  if (!a || !b || a.type !== b.type) return false;
  if (a.type === 'MOVE') return a.to?.x === b.to?.x && a.to?.y === b.to?.y;
  if (a.type === 'CLAIM' || a.type === 'JAM') return a.relayId === b.relayId;
  return a.type === 'END_TURN';
}
function gameError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
