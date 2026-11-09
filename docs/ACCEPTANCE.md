# Acceptance checklist

This checklist separates requirements implemented in the repository from work that can only be completed after connecting GitHub and deploying a public instance.

| Requirement | Local implementation | Evidence / verification |
|---|---|---|
| Turn-based strategy, 2–4 players | Implemented | Engine setup and integration tests |
| Match under 10 minutes | Implemented by six rounds × 20-second turn deadline | Engine turn transition and whole-turn deadline tests |
| Browser play, no install/login | Implemented | Static browser client served by Node HTTP server |
| Human + agent in same match | Implemented | API integration test and sample-bot integration test |
| HTTP/JSON state and move API | Implemented | `docs/API.md` and API integration test |
| Lobby/match code | Implemented | Create/join endpoints and browser lobby |
| Fill empty seats with bots | Implemented | Host start flow and API integration test |
| Basic sample bot | Implemented | `bot/sample-bot.mjs`; full mixed-match test |
| Clear winner condition | Implemented | Six-round scoring and deterministic tiebreaks |
| Match log | Implemented | Append-only sequence-numbered events and `/events` endpoint |
| Public repository | Pending GitHub connection and repository creation | Must verify repository visibility after push |
| Public game URL | Pending hosting credentials and deployment | Must verify from an external browser/API request |
| Real-world balance/playtest | Partially tested | Randomized simulation is a smoke test, not a substitute for human playtesting |

## Local test command

```bash
npm test
```

The suite includes engine rules, API authentication/idempotency, a full match played by an external sample bot alongside a human-controlled seat and a built-in bot, 120 deterministic bot matches, and 900 randomized-seat smoke simulations. A passing local test suite does not imply that a public deployment has been completed or independently verified.
