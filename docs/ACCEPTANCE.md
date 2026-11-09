# Acceptance checklist

This checklist distinguishes implemented features and verified evidence from the remaining release gates. It does not treat local tests as proof of public deployment or human playtesting.

| Requirement | Status | Evidence / verification |
|---|---|---|
| Turn-based strategy, 2–4 players | Implemented | Engine setup and integration tests |
| Match under 10 minutes | Implemented by six rounds × 20-second turn deadline | Engine turn transition and whole-turn deadline tests; worst-case timer budget is 8 minutes |
| Browser play, no install/login | Implemented locally | Static browser client served by the Node HTTP server; external public URL is still pending |
| Human + agent in same match | Implemented and integration-tested | Mixed human/agent sample-bot match test |
| HTTP/JSON state and move API | Implemented and documented | `docs/API.md` and API integration test |
| Lobby/match code | Implemented | Create/join endpoints and browser lobby |
| Fill empty seats with bots | Implemented | Host start flow and API integration test |
| Basic sample bot | Implemented and full-match-tested | `bot/sample-bot.mjs`; mixed-match integration test |
| Clear winner condition | Implemented | Six-round scoring and deterministic tiebreaks |
| Match log | Implemented | Append-only sequence-numbered events and `/events` endpoint |
| Public repository | Complete | Public GitHub repository; source files and docs verified on `main` |
| Public game URL | **Pending** | Hosting and external browser/API smoke test are still required |
| Human playtesting and game balance | Partially verified | Simulations are smoke tests, not a substitute for independent human playtesting |

## Automated test evidence

The latest GitHub Actions CI run on the published `main` commit passed `npm test` with all 21 tests successful. The suite includes engine rules, HTTP/API authentication and idempotency, one complete mixed match with an external sample bot, 120 deterministic bot matches, and 900 randomized-seat/map smoke simulations.

The 120 full bot matches plus 900 randomized smoke simulations do **not** equal 500 full multi-policy balance matches. The balance plan in the design document calls for a larger multi-policy sample and analysis of seat win rates; that analysis remains additional work before claiming the game is balanced.

## Local test command

```bash
npm test
```

A passing local or CI test suite does not imply that a public deployment has been completed, that the game has been independently play-tested by humans, or that the requester will select this submission.
