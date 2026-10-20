Read CLAUDE.md, docs/build-spec.md and prototype/index.html.

Start Milestone 0:
1. Scaffold the pnpm/Turborepo monorepo with apps/web (Next.js 15, TS strict, Tailwind),
   packages/core, packages/db (Prisma + the schema in the spec), docker-compose for Postgres.
2. Implement packages/core per the spec, porting the math from the prototype's script.
   Write Vitest tests first. aprFromFlatFee(700, 26) must return ~0.264.
   installmentKes must round to whole shillings with the last installment absorbing rounding.
3. Seed script with the six fictional circles from the prototype.
4. Set up the pnpm scripts listed in CLAUDE.md and a GitHub Actions workflow for lint/typecheck/test.

Make an initial commit, then commit after each of the four steps. Stop and summarise
before starting Milestone 1.
