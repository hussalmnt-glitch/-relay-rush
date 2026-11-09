import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME, createInitialGame, legalActions, applyGameAction, forceEndTurn,
  refreshRelayCounts, chooseBotAction,
} from '../src/shared/game.mjs';

function players(count = 2) {
  return Array.from({ length: count }, (_, index) => ({ id: `P${index + 1}`, name: `Player ${index + 1}`, kind: index === 1 ? 'agent' : 'human' }));
}
function makeGame(count = 2) { return createInitialGame(players(count), { now: 1_000 }); }
function act(game, playerId, action, now = 2_000) { return applyGameAction(game, playerId, action, { now }); }

test('creates matches for 2–4 players with valid spawn positions', () => {
  for (const count of [2, 3, 4]) {
    const game = makeGame(count);
    assert.equal(game.players.length, count);
    assert.equal(game.phase, 'playing');
    assert.equal(game.actionPoints, 2);
    assert.equal(game.round, 1);
    assert.equal(game.players[0].x, 0);
  }
  assert.throws(() => createInitialGame(players(1)), /requires 2-4/);
  assert.throws(() => createInitialGame(players(5)), /requires 2-4/);
});

test('only offers legal orthogonal moves and blocks relay/occupied cells', () => {
  const game = makeGame(2);
  const legal = legalActions(game, 'P1');
  assert(legal.some((action) => action.type === 'MOVE' && action.to.x === 1 && action.to.y === 0));
  assert(!legal.some((action) => action.type === 'MOVE' && action.to.x === 1 && action.to.y === 1));
  assert(!legal.some((action) => action.type === 'MOVE' && action.to.x === 0 && action.to.y === 1 && game.relays.some(r => r.x === 0 && r.y === 1)));
  game.players[1].x = 1; game.players[1].y = 0;
  assert(!legalActions(game, 'P1').some((action) => action.type === 'MOVE' && action.to.x === 1 && action.to.y === 0));
});

test('rejects illegal movement and accepts a valid movement', () => {
  const game = makeGame(2);
  assert.throws(() => act(game, 'P1', { type: 'MOVE', to: { x: 1, y: 1 } }), /not legal/);
  act(game, 'P1', { type: 'MOVE', to: { x: 1, y: 0 } });
  assert.deepEqual({ x: game.players[0].x, y: game.players[0].y }, { x: 1, y: 0 });
  assert.equal(game.actionPoints, 1);
});

test('claims a neutral relay only from an adjacent cell', () => {
  const game = makeGame(2);
  game.players[0].x = 0; game.players[0].y = 3;
  assert(legalActions(game, 'P1').some((action) => action.type === 'CLAIM' && action.relayId === 'west'));
  act(game, 'P1', { type: 'CLAIM', relayId: 'west' });
  assert.equal(game.relays.find((relay) => relay.id === 'west').ownerId, 'P1');
  assert.equal(game.players[0].relaysOwned, 1);
});

test('rejects a claim from a non-adjacent cell', () => {
  const game = makeGame(2);
  assert.throws(() => act(game, 'P1', { type: 'CLAIM', relayId: 'core' }), /not legal/);
});

test('JAM spends one pulse, works within two cells, and cannot repeat on the same relay in a round', () => {
  const game = makeGame(2);
  const west = game.relays.find((relay) => relay.id === 'west');
  west.ownerId = 'P2';
  game.players[0].x = 0; game.players[0].y = 2; // distance 2 from west relay
  assert(legalActions(game, 'P1').some((action) => action.type === 'JAM' && action.relayId === 'west'));
  act(game, 'P1', { type: 'JAM', relayId: 'west' });
  assert.equal(game.players[0].pulses, 0);
  assert.equal(west.jammedRound, 1);
  assert(!legalActions(game, 'P1').some((action) => action.type === 'JAM' && action.relayId === 'west'));
});

test('scores owned relays at round end and suppresses a jammed relay', () => {
  const game = makeGame(2);
  game.relays.find((relay) => relay.id === 'core').ownerId = 'P1';
  game.relays.find((relay) => relay.id === 'west').ownerId = 'P1';
  game.relays.find((relay) => relay.id === 'east').ownerId = 'P2';
  game.relays.find((relay) => relay.id === 'east').jammedRound = 1;
  forceEndTurn(game, 'test', 3_000);
  forceEndTurn(game, 'test', 4_000);
  assert.equal(game.players.find((p) => p.id === 'P1').score, 3);
  assert.equal(game.players.find((p) => p.id === 'P2').score, 0);
  assert.equal(game.round, 2);
  assert.equal(game.relays.find((relay) => relay.id === 'east').jammedRound, null);
});

test('recharges one pulse after rounds 2 and 4, capped at two', () => {
  const game = makeGame(2);
  game.round = 2;
  game.turnOrder = ['P1', 'P2']; game.turnIndex = 0; game.currentPlayerId = 'P1';
  game.players[0].pulses = 0; game.players[1].pulses = 2;
  forceEndTurn(game, 'test', 5_000);
  forceEndTurn(game, 'test', 6_000);
  assert.equal(game.players[0].pulses, 1);
  assert.equal(game.players[1].pulses, 2);
  assert.equal(game.round, 3);
});

test('rotates first player across rounds', () => {
  const game = makeGame(3);
  const first = game.turnOrder[0];
  for (let i = 0; i < 3; i += 1) forceEndTurn(game, 'test', 10_000 + i);
  assert.equal(game.round, 2);
  assert.notEqual(game.turnOrder[0], first);
});

test('ends after six rounds and determines a winner by score then relay count', () => {
  const game = makeGame(2);
  game.players[0].score = 20;
  for (let round = 1; round <= GAME.rounds; round += 1) {
    game.round = round;
    game.turnOrder = ['P1', 'P2']; game.turnIndex = 0; game.currentPlayerId = 'P1';
    forceEndTurn(game, 'test', 20_000 + round * 10);
    forceEndTurn(game, 'test', 20_001 + round * 10);
  }
  assert.equal(game.phase, 'finished');
  assert.deepEqual(game.winnerIds, ['P1']);
});

test('returns shared victory when score and relay count remain tied', () => {
  const game = makeGame(2);
  game.round = GAME.rounds;
  game.players[0].score = 9; game.players[1].score = 9;
  game.players[0].relaysOwned = 2; game.players[1].relaysOwned = 2;
  // Trigger final scoring with no owned relays so equal totals remain equal.
  game.turnOrder = ['P1', 'P2']; game.turnIndex = 0; game.currentPlayerId = 'P1';
  forceEndTurn(game, 'test', 40_000); forceEndTurn(game, 'test', 40_001);
  assert.equal(game.phase, 'finished');
  assert.equal(game.draw, true);
  assert.deepEqual(game.winnerIds.sort(), ['P1', 'P2']);
});

test('basic bot always selects an action advertised by the legal-action list', () => {
  const game = makeGame(4);
  for (const player of game.players) {
    const action = chooseBotAction(game, player.id);
    assert(legalActions(game, game.currentPlayerId).some((candidate) => JSON.stringify(candidate) === JSON.stringify(action)) || action.type === 'END_TURN');
  }
});

test('keeps the original deadline for the whole turn rather than resetting it per action', () => {
  const game = makeGame(2);
  const deadline = game.turnDeadline;
  act(game, 'P1', { type: 'MOVE', to: { x: 1, y: 0 } }, 10_000);
  assert.equal(game.turnDeadline, deadline);
});

test('rotates corner spawn assignments across match seeds', () => {
  const seen = new Set();
  for (let offset = 0; offset < 4; offset += 1) {
    const game = createInitialGame(players(2), { now: 1_000, spawnOffset: offset, spawnPermutationSeed: offset + 101 });
    const positions = game.players.map((player) => `${player.x},${player.y}`).join('|');
    seen.add(positions);
    assert(game.players.every((player) => GAME.spawns.some((spawn) => spawn.x === player.x && spawn.y === player.y)));
  }
  assert.equal(seen.size, 4);
});

test('supports code-derived opening-player rotation independently from spawn assignment', () => {
  const firstPlayers = new Set();
  for (let offset = 0; offset < 4; offset += 1) {
    const game = createInitialGame(players(4), { now: 1_000, spawnOffset: offset, firstPlayerOffset: offset });
    firstPlayers.add(game.currentPlayerId);
  }
  assert.equal(firstPlayers.size, 4);
});

test('worst-case four-player match stays below the ten-minute bounty limit', () => {
  const worstCaseSeconds = GAME.rounds * GAME.maxPlayers * GAME.turnSeconds;
  assert.equal(worstCaseSeconds, 8 * 60);
  assert(worstCaseSeconds < 10 * 60);
});
