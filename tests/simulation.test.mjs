import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGame, chooseBotAction, applyGameAction, GAME } from '../src/shared/game.mjs';

test('deterministic bots can complete 120 full matches without illegal actions or deadlocks', () => {
  let completed = 0;
  const counts = new Map();
  for (let matchNo = 0; matchNo < 120; matchNo += 1) {
    const count = 2 + (matchNo % 3);
    const players = Array.from({ length: count }, (_, index) => ({ id: `P${index + 1}`, name: `Bot ${index + 1}`, kind: 'bot' }));
    const game = createInitialGame(players, { now: 1000 });
    let steps = 0;
    while (game.phase === 'playing' && steps < 500) {
      const action = chooseBotAction(game, game.currentPlayerId);
      applyGameAction(game, game.currentPlayerId, action, { now: 2000 + steps });
      steps += 1;
    }
    assert.equal(game.phase, 'finished', `match ${matchNo} failed to finish`);
    assert.equal(game.roundsCompleted, GAME.rounds);
    assert(steps < 500);
    assert.equal(game.events.at(-1).type, 'MATCH_FINISHED');
    for (const winner of game.winnerIds) counts.set(winner, (counts.get(winner) || 0) + 1);
    completed += 1;
  }
  assert.equal(completed, 120);
  assert(counts.size > 0);
});
