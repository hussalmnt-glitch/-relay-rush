# Relay Rush

**A compact, turn-based strategy game for humans and AI agents.** Play in a browser, or join the same match through a documented HTTP/JSON API.

## Play the game

Relay Rush is a turn-based strategy game for 2–4 players on a 7×7 grid, lasting six rounds. On your turn you have two action points: move one orthogonal cell, claim a relay from an adjacent cell, or spend a pulse to jam an enemy relay within two cells until the round ends. Outer relays score 1 point and the Core scores 2 at the end of each round unless jammed. After round six, the highest score wins; ties are broken by relays held, then shared.

The server enforces a 20-second deadline for each turn. Even a full four-player match with all 24 turns timing out ends within eight minutes, below the bounty's ten-minute limit.

## Requirements

- Node.js 20 or newer
- No npm dependencies are required

## Run locally

```bash
git clone https://github.com/hussalmnt-glitch/-relay-rush.git
cd relay-rush
npm start
```

Open `http://localhost:3000`. To run with a persistent data directory:

```bash
DATA_DIR=./data PORT=3000 npm start
```

For development with automatic server restarts:

```bash
npm run dev
```

## Play with people and bots

1. Create a match and choose 2–4 seats.
2. Share the six-character match code with another human or AI agent.
3. The host can start after at least two seats join.
4. Turn on **Fill empty seats with bots** to add server-controlled bots to all remaining seats.
5. A human can open the same public URL, enter the code, and join without creating an account.

## Run the sample agent

Start the server and create a match with at least one available seat. Then run:

```bash
npm run bot -- --url http://localhost:3000 --code ABC123 --name "Sample Agent"
```

The sample bot joins as an agent, waits for the host to start, reads the authenticated state endpoint, selects from server-advertised legal actions, and submits moves through the public HTTP API. It can play in the same match as browser users.

## Agent API

The agent API is documented in [`docs/API.md`](docs/API.md). Core flow:

1. `POST /api/agent/matches/:code/join`
2. `GET /api/agent/matches/:code/state` with `Authorization: Bearer <playerToken>`
3. `POST /api/agent/matches/:code/moves` with the same token

The state response includes `legalActions`, `turnId`, `actionPoints`, player positions, relay ownership, score, and event history. Each move includes a unique `requestId` for idempotency and the current `turnId` to reject stale commands.

## HTTP endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Service health and version |
| `POST` | `/api/matches` | Create a lobby |
| `GET` | `/api/matches/:code` | Read public lobby/game state |
| `POST` | `/api/matches/:code/join` | Join as a human |
| `POST` | `/api/agent/matches/:code/join` | Join as an AI agent |
| `POST` | `/api/matches/:code/start` | Host starts; optionally fills bots |
| `GET` | `/api/matches/:code/state` | Authenticated state with legal actions |
| `POST` | `/api/matches/:code/action` | Submit a browser player's action |
| `GET` | `/api/agent/matches/:code/state` | Agent state endpoint |
| `POST` | `/api/agent/matches/:code/moves` | Agent move endpoint |
| `GET` | `/api/matches/:code/events` | Append-only match event log |

## Tests

Run all engine tests, HTTP/API integration checks, sample-bot full-match test, and simulation checks with:

```bash
npm test
```

## Architecture

- `src/shared/game.mjs` — deterministic authoritative game rules, legal action calculation, scoring and bot heuristic.
- `src/server/server.mjs` — Node HTTP server, lobby/match lifecycle, token auth, JSON API, rate limiting, timeout handling and persistence.
- `src/client/` — responsive browser UI with Arabic/English localization and a 2D grid map.
- `bot/sample-bot.mjs` — external sample agent using the same public API as third-party agents.
- `tests/` — built-in Node test runner; no test framework install required.

The server is authoritative. The browser and agents submit actions; neither can directly change the game state. `requestId` deduplicates retries, and `turnId` prevents stale moves.

## Deployment notes

This is a single-process Node service. Deploy one application instance with a persistent writable disk mounted at `DATA_DIR`. The JSON store is intentionally dependency-free and suitable for a small bounty demo; it is **not** a multi-instance database. Do not run multiple replicas against the same JSON file. For a larger production audience, replace the persistence adapter with a transactional database before horizontal scaling.

Set `PORT` and `DATA_DIR` in the hosting environment. The public game URL and public repository URL should only be announced after deployment and external browser/API smoke tests succeed.

## Security notes

- No accounts or login are required for browser players.
- Seat tokens and host tokens are secrets. Keep them out of URLs and source control.
- Host-only start is enforced server-side.
- Player actions are authenticated and revalidated by the server.
- Public match state never includes private tokens.
- Agent requests have a 32 KB body limit and per-IP rate limiting.

## License

MIT. See [`LICENSE`](LICENSE).
