# Relay Rush — official rules for this implementation

Relay Rush is a turn-based strategy game for 2–4 players on a 7×7 grid, lasting six rounds. On your turn you have two action points: move one orthogonal cell, claim a relay from an adjacent cell, or spend a pulse to jam an enemy relay within two cells until the round ends. Outer relays score 1 point and the Core scores 2 at the end of each round unless jammed. After round six, the highest score wins; ties are broken by relays held, then shared.

## Map

- Board coordinates are `x=0..6`, `y=0..6`.
- Players spawn at corners. In a two-player match, opposite corners are used; in a three-player match, three corners are used; in a four-player match, all corners are used. The corner-to-seat assignment rotates between match codes to reduce fixed-seat advantage.
- Relays are not walkable cells:
  - North: `(3,1)`, 1 point
  - East: `(5,3)`, 1 point
  - South: `(3,5)`, 1 point
  - West: `(1,3)`, 1 point
  - Core: `(3,3)`, 2 points
- Movement is one orthogonal cell. Diagonal movement is illegal. A player cannot move outside the board, onto a relay, or onto another player's unit.
- Manhattan distance is used for adjacency and Jam range.

## Turn and round

- Every player receives 2 action points (AP) per turn.
- MOVE, CLAIM, and JAM each cost 1 AP.
- END_TURN is always available and does not cost AP.
- If AP reaches zero, the turn ends automatically.
- A turn has a 20-second server-side limit. On timeout, remaining AP is forfeited and the next turn begins. A full four-player match has at most 24 turns, so even if every turn times out it completes within 8 minutes (below the 10-minute bounty limit).
- The match code rotates the corner assignment and selects the opening player, so the host is not guaranteed a fixed starting corner or the opening move; the first seat rotates by one each round thereafter.

## Actions

- MOVE: move one cell north/east/south/west if the destination is legal.
- CLAIM: if your unit is orthogonally adjacent to a neutral or enemy-owned relay, claim it. A relay already owned by you cannot be claimed again.
- JAM: spend one pulse to stop an enemy-owned relay from scoring this round. Your unit must be within Manhattan distance 2. Ownership does not change. A relay can be jammed only once per round.

## Pulses and scoring

- Each player begins with one pulse; maximum capacity is two.
- At the end of rounds 2 and 4, each player gains one pulse up to the maximum.
- At the end of a round, each owned relay that was not jammed that round awards its value to its owner.
- Jams clear after that round's scoring. A jam does not transfer ownership.

## End condition

The match ends after scoring round six. Highest score wins. If tied, the player holding the most relays wins. If still tied, the result is a shared victory.
