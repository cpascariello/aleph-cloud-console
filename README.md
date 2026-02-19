# Aleph Cloud Console

Deploy and manage compute resources on the Aleph decentralized network.

## Documentation

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Agent entry point — project overview, commands, features, working habits |
| `docs/ARCHITECTURE.md` | Technical patterns — entity managers, React Query, wizards, wallet, payment |
| `docs/DECISIONS.md` | Decision log with rationale |
| `docs/BACKLOG.md` | Deferred ideas and scope creep parking lot |
| `docs/plans/` | Design and implementation plans (read-only reference) |

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 (strict) |
| Styling | Tailwind CSS 4 + [data-terminal](https://github.com/cpascariello/data-terminal) design system |
| Server state | TanStack React Query |
| Forms | React Hook Form + Zod |
| Wallet | Reown SDK (ETH, AVAX, BASE, SOL) |
| Icons | Lucide React |

## Monorepo Structure

```
packages/
  aleph-sdk/       # Domain logic — entity managers, types, Zod schemas
  console/         # Next.js app — pages, components, hooks, providers
  data-terminal/   # Symlink to design system repo
```

## Commands

```bash
pnpm dev              # Dev server (port 3000)
pnpm build            # Build SDK + console
pnpm typecheck        # Type check all packages
pnpm lint             # Lint all packages
pnpm test             # Run all tests
pnpm --filter console dev        # Console dev server only
pnpm --filter aleph-sdk test     # SDK tests only
```
