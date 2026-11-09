import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGame, legalActions, applyGameAction } from '../src/shared/game.mjs';

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
}

test('randomized seat/map smoke simulation does not expose a single overwhelming seat', () => {
  const totals = new Map();
  for (let matchNo = 0; matchNo < 900; matchNo += 1) {
    const count = 2 + (matchNo % 3);
    const players = Array.from({ length: count }, (_, index) => ({ id: `P${index + 1}`, name: `Random ${index + 1}`, kind: 'agent' }));
    const offset = matchNo % 4;
    const game = createInitialGame(players, {
      now: 0,
      spawnOffset: offset,
      firstPlayerOffset: (matchNo * 13 + Math.floor(matchNo / 4)) % count,
      spawnPermutationSeed: matchNo * 7919 + 17,
    });
    const random = seededRandom((matchNo + 1) * 7919);
    let steps = 0;
    while (game.phase === 'playing' && steps < 300) {
      const options = legalActions(game, game.currentPlayerId);
      const actions = options.filter((action) => action.type !== 'END_TURN');
      const action = actions.length && random() < 0.8
        ? actions[Math.floor(random() * actions.length)]
        : { type: 'END_TURN' };
      applyGameAction(game, game.currentPlayerId, action, { now: 1000 + steps });
      steps += 1;
    }
    assert.equal(game.phase, 'finished');
    if (!game.draw) {
      const winner = game.winnerIds[0];
      const key = `${count}:${winner}`;
      totals.set(key, (totals.get(key) || 0) + 1);
    }
  }
  for (const count of [2, 3, 4]) {
    const winners = Array.from({ length: count }, (_, index) => totals.get(`${count}:P${index + 1}`) || 0);
    const outright = winners.reduce((sum, value) => sum + value, 0);
    assert(outright > 0, `there should be decisive ${count}-player outcomes`);
    assert(Math.max(...winners) / outright < 0.62, `${count}-player simulation shows excessive seat skew: ${winners.join(', ')}`);
  }
});
