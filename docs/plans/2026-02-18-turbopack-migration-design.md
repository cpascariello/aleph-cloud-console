# Turbopack Migration Design

**Date:** 2026-02-18
**Status:** Approved

## Problem

The console dev server runs `next dev --webpack` because a custom `ContextualAliasPlugin` resolves `@/` imports differently based on whether the importing file is inside data-terminal or console. Turbopack has no per-file conditional resolver, so this webpack plugin blocks adoption. Turbopack is significantly faster for dev compilation.

## Solution

Standardize data-terminal's internal imports on the `@dt/` prefix (already used by the console to import data-terminal components). This eliminates the `@/` collision between the two projects, making the `ContextualAliasPlugin` unnecessary and enabling a straight migration to Turbopack's `resolveAlias`.

## Code Changes

### data-terminal (69 files, ~140 import edits)

- Replace all `@/` → `@dt/` in source files (mechanical find-replace)
- `tsconfig.json`: change `"@/*": ["./src/*"]` → `"@dt/*": ["./src/*"]`
- `vitest.config.ts`: change alias `"@"` → `"@dt"`

### console (next.config.ts)

- Delete `ContextualAliasPlugin` class and entire `webpack` function
- Add `turbopack.resolveAlias` with `@dt/*` mappings:
  - `@dt/atoms` → data-terminal/src/atoms
  - `@dt/molecules` → data-terminal/src/molecules
  - `@dt/hooks` → data-terminal/src/hooks
  - `@dt/lib` → data-terminal/src/lib
  - `@dt/providers` → data-terminal/src/providers
  - `@dt/types` → data-terminal/src/types
- Node.js built-in stubs via `resolveAlias` with `{ browser: "./src/lib/empty.ts" }`
- Create `src/lib/empty.ts` stub file

### console (tsconfig.json)

- Remove dead paths: `@/atoms/*`, `@/molecules/*` (no console file uses these)
- Remove data-terminal fallbacks from `@/hooks/*`, `@/lib/*`, `@/types/*`

### console (package.json)

- Remove `--webpack` flag from `dev` script

## Documentation Changes

### data-terminal

- `docs/ARCHITECTURE.md` — update `@/` references to `@dt/` (line 197: generic component rule, line 243: molecule recipe)
- `docs/DESIGN-SYSTEM.md` — update all import examples from `@/` to `@dt/`
- `docs/BACKLOG.md` — move "Use unique internal path prefix" to Completed
- `docs/DECISIONS.md` — log decision to adopt `@dt/` prefix
- `docs/plans/` — leave as-is (historical reference, read-only)

### console

- `docs/ARCHITECTURE.md` — rewrite "Tailwind CSS 4 + Webpack PostCSS" pattern to reflect Turbopack; update "Design System Integration" pattern to reference `turbopack.resolveAlias`
- `docs/DECISIONS.md` — log Turbopack migration decision
- `docs/BACKLOG.md` — move "Migrate webpack ContextualAliasPlugin to Turbopack" to Completed

## Regression Safety

| Check | What it catches |
|---|---|
| data-terminal `pnpm typecheck` | Missed `@/` → `@dt/` renames in source |
| data-terminal `pnpm test` | Vitest alias config correct |
| data-terminal `pnpm build` | Next.js resolves `@dt/` via tsconfig paths |
| console `pnpm typecheck` | tsconfig path cleanup didn't break anything |
| console `pnpm test` | SDK + console tests still pass |
| console `pnpm build` | Turbopack resolves all aliases correctly |
| console `pnpm dev` (no `--webpack`) | Turbopack dev server works end-to-end |

TypeScript is the primary safety net: removing `@/*` from data-terminal's tsconfig means any leftover `@/` import is an immediate compile error.
