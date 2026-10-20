# Kopa Circles

Crowdfunded micro-lending for borrower circles in Kenya. Kiva × Grameen, no MFI in the middle.

- `CLAUDE.md` — domain rules and conventions Claude Code must follow
- `docs/build-spec.md` — stack, data model, core functions, milestones M0–M4
- `docs/business-plan.md` — the why (condensed)
- `prototype/index.html` — clickable prototype; open it in a browser. Reference for UX and loan math.
- `docs/first-session.md` — the prompt to start the first Claude Code session
- `docs/deploy.md` — putting it online (Vercel, Neon, Resend, Africa's Talking)

## Start

```sh
cd kopa-circles
claude
```
Then paste the contents of `docs/first-session.md`.

## Develop

Needs Node 20+, pnpm 10 and Docker (for local Postgres).

```sh
pnpm install
cp .env.example .env
pnpm db:up          # Postgres in docker-compose
pnpm db:migrate
pnpm db:seed        # six fictional sample circles from the prototype
pnpm dev            # http://localhost:3000
```

Checks: `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright;
run `pnpm --filter web exec playwright install chromium` once first). CI runs lint,
typecheck and test on every push.
