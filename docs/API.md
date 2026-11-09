# Relay Rush HTTP/JSON API

Base URL: the same origin that serves the browser game. All request and response bodies are JSON. The API is intentionally small so a basic agent can join and play with a few lines of code.

## Authentication

Each human or agent seat receives a unique opaque `playerToken` when it joins. Send it as:

```http
Authorization: Bearer <playerToken>
```

The token belongs to one seat and must be kept private. The host also receives a separate `hostToken`; only the host token can start a match. Never put either token in a URL, source repository, screenshot, or public log.

## Create and join

### `POST /api/matches`

Create a lobby as a human host.

```json
{ "name": "Nova", "maxPlayers": 4 }
```

`maxPlayers` must be 2, 3, or 4. Response (201):

```json
{
  "code": "AB12CD",
  "playerToken": "<private-seat-token>",
  "hostToken": "<private-host-token>",
  "playerId": "P1",
  "match": { "code": "AB12CD", "phase": "lobby", "maxPlayers": 4 }
}
```

### `POST /api/matches/:code/join`

Join as a human before the match starts.

```json
{ "name": "Orion" }
```

Response (201) includes `playerToken`, `playerId`, and the public match state.

### `POST /api/agent/matches/:code/join`

Join as an external AI agent. Request and response match the human join endpoint, except the seat kind is `agent`.

### `POST /api/matches/:code/start`

Host only. The host token is supplied in the JSON body rather than a URL.

```json
{ "hostToken": "<private-host-token>", "fillWithBots": true }
```

At least two seats are required. When `fillWithBots` is `true`, every empty seat up to the lobby capacity is filled with a server-controlled sample bot. When `false`, the match starts with the joined seats (minimum two).

## Read state

### `GET /api/matches/:code`

Returns the public lobby or match state. It never includes seat or host tokens.

### `GET /api/matches/:code/state`

Requires a seat token. Returns the game state plus `you`, `isYourTurn`, `actionPoints`, and `legalActions`. Agents and browser clients should use this endpoint as their source of truth.

### `GET /api/agent/matches/:code/state`

Agent alias for the authenticated state endpoint.

Example response fields:

```json
{
  "phase": "playing",
  "round": 2,
  "currentPlayerId": "P2",
  "turnId": 7,
  "actionPoints": 2,
  "you": "P2",
  "isYourTurn": true,
  "legalActions": [
    { "type": "MOVE", "to": { "x": 3, "y": 2 } },
    { "type": "CLAIM", "relayId": "core" },
    { "type": "END_TURN" }
  ]
}
```

`legalActions` is advisory for planning. The server validates every submitted action again.

## Submit moves

### `POST /api/agent/matches/:code/moves`

Requires the agent's seat token. Human browser clients use `POST /api/matches/:code/action` with the same body.

```json
{
  "turnId": 7,
  "requestId": "unique-id-for-this-action",
  "action": { "type": "CLAIM", "relayId": "core" }
}
```

`requestId` is required and idempotent per seat: a retry by the same seat with the same ID will not apply the action twice. Different seats may safely reuse the same request ID. `turnId` prevents stale actions from being applied after the turn changes.

Supported actions:

```json
{ "type": "MOVE", "to": { "x": 2, "y": 3 } }
{ "type": "CLAIM", "relayId": "north" }
{ "type": "JAM", "relayId": "core" }
{ "type": "END_TURN" }
```

The `END_TURN` action does not spend an action point. Other actions cost one AP.

## Events and replay

### `GET /api/matches/:code/events`

Returns the append-only, sequence-numbered event log. The final game state can be audited from events. The browser includes a compact match feed and a full log view.

## Error format

```json
{
  "error": {
    "code": "NOT_YOUR_TURN",
    "message": "It is not your turn."
  }
}
```

Common status codes: `400` malformed input, `401` invalid/missing seat token, `403` host-only or seat restriction, `404` unknown match/route, `409` stale turn or state conflict, `413` body too large, `422` illegal action, and `429` rate limit exceeded.

## Agent loop

1. Join with `POST /api/agent/matches/:code/join` and securely store the returned token.
2. Poll `GET /api/agent/matches/:code/state` until `isYourTurn` is `true`.
3. Select one object from `legalActions`.
4. Submit it with the current `turnId` and a fresh `requestId`.
5. Repeat until `phase` is `finished`.

The included `bot/sample-bot.mjs` implements this loop and uses the same public API as any external agent.
