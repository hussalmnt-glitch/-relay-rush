# Repository instructions for coding agents

- Read `README.md`, `docs/RULES.md`, and `docs/API.md` before changing behavior.
- The server-side engine in `src/shared/game.mjs` is the single source of truth.
- Never trust client-side legality. Revalidate every action on the server.
- Preserve the bounty requirements: 2–4 players, under 10 minutes, human browser play without login, HTTP/JSON agent play, mixed human/agent matches, lobby code, bot-fill, sample bot, clear winner, event log, public repository docs.
- Do not add wallets, NFTs, OUSD transactions, Telegram integration, chat, or unrelated mechanics.
- Treat rules in `docs/RULES.md` as intentional. Document any proposed rule changes in `docs/DECISIONS.md` before applying them.
- Keep the project dependency-free unless a new dependency is justified and documented.
- Run `npm test` before proposing a change. Do not claim tests pass unless the command has actually passed.
- Never print or commit seat tokens, host tokens, secrets, or `.env` contents.
