# Architecture and product decisions

## 2026-11-09 — Keep the bounty build dependency-free

The first implementation uses only Node.js built-ins and browser-native JavaScript rather than a framework dependency tree. The task is small, the server and frontend can be served from one origin, and avoiding install-time dependencies makes the project easy for a reviewer to run. The visual interface is custom HTML/CSS/JS; the server is authoritative.

## 2026-11-09 — Polling instead of WebSockets in the first release

The bounty only requires HTTP/JSON for agents and does not mandate WebSockets. The browser polls the authenticated state endpoint roughly once per second. This keeps the interface and agent API on the same simple state contract and avoids adding a second transport protocol. If higher concurrency or lower update latency becomes necessary, a WebSocket channel can be added without changing game rules or agent actions.

## 2026-11-09 — Single-process persistence for the bounty demo

Match state and request idempotency records are atomically written to a JSON data file. This is dependency-free and suitable for a single-instance demo with a persistent disk. It is not a multi-instance database; horizontal scaling requires a transactional storage adapter.

## 2026-11-09 — Seat-neutral opening

Match code influences spawn corner assignment and opening player. The first-player order rotates each round. This avoids always giving the host the same starting location or first move. Randomized simulation remains a smoke test, not proof of perfect balance.
