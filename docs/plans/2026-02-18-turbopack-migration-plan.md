# Turbopack Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the webpack ContextualAliasPlugin with Turbopack's resolveAlias by standardizing data-terminal's internal imports on the `@dt/` prefix.

**Architecture:** data-terminal currently uses `@/` for internal imports, colliding with the console's `@/`. A custom webpack plugin resolves this at bundle time, blocking Turbopack adoption. We rename data-terminal's `@/` to `@dt/` (which the console already aliases), then delete the webpack plugin and switch to Turbopack's native `resolveAlias`.

**Tech Stack:** Next.js 16, TypeScript 5.9, Turbopack, Vitest

---

### Task 1: Update data-terminal config files

**Files:**
- Modify: `/Users/dio/repos/data-terminal/tsconfig.json:30-33`
- Modify: `/Users/dio/repos/data-terminal/vitest.config.ts:9-11`

**Step 1: Update tsconfig paths**

In `tsconfig.json`, change the `paths` from `@/*` to `@dt/*`:

```json
"paths": {
  "@dt/*": [
    "./src/*"
  ]
}
```

**Step 2: Update vitest alias**

In `vitest.config.ts`, change the alias key from `@` to `@dt`:

```ts
resolve: {
  alias: {
    "@dt": resolve(import.meta.dirname, "src"),
  },
},
```

---

### Task 2: Rename all @/ imports in data-terminal source

**Files:**
- Modify: 69 files in `/Users/dio/repos/data-terminal/src/` (140 import statements)

**Step 1: Bulk rename imports**

Run from data-terminal root:

```bash
fd -e ts -e tsx . /Users/dio/repos/data-terminal/src \
  -x sed -i '' 's|from "@/|from "@dt/|g' {}
```

**Step 2: Verify no @/ imports remain**

```bash
rg 'from "@/' /Users/dio/repos/data-terminal/src/
```

Expected: no output (zero matches).

---

### Task 3: Verify data-terminal standalone

**Step 1: TypeScript**

```bash
cd /Users/dio/repos/data-terminal && pnpm typecheck
```

Expected: passes (tsconfig `@dt/*` → `./src/*` resolves all imports).

**Step 2: Tests**

```bash
cd /Users/dio/repos/data-terminal && pnpm test
```

Expected: passes (vitest alias `@dt` → `src/` resolves imports in test files).

**Step 3: Build**

```bash
cd /Users/dio/repos/data-terminal && pnpm build
```

Expected: passes (Next.js Turbopack reads tsconfig paths for `@dt/*`).

**Step 4: Commit data-terminal changes**

```bash
cd /Users/dio/repos/data-terminal
git add -A
git commit -m "refactor: rename @/ imports to @dt/ prefix

Avoids path alias collision when consumed as source by other
projects. Enables Turbopack adoption in consumers by eliminating
the need for a contextual webpack resolver plugin."
```

---

### Task 4: Create empty module stub in console

**Files:**
- Create: `packages/console/src/lib/empty.ts`

**Step 1: Create the stub**

```ts
export default {};
```

This replaces webpack's `resolve.fallback: { fs: false }` pattern. Turbopack uses `resolveAlias` with `{ browser: "./src/lib/empty.ts" }` to stub Node.js built-ins for client bundles.

---

### Task 5: Rewrite console next.config.ts for Turbopack

**Files:**
- Modify: `packages/console/next.config.ts` (full rewrite)

**Step 1: Replace the entire file**

```ts
import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(__dirname, "../..");
const dtRoot = path.resolve(__dirname, "../data-terminal/src");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ["data-terminal"],
  turbopack: {
    resolveAlias: {
      "@dt/atoms": path.join(dtRoot, "atoms"),
      "@dt/molecules": path.join(dtRoot, "molecules"),
      "@dt/hooks": path.join(dtRoot, "hooks"),
      "@dt/lib": path.join(dtRoot, "lib"),
      "@dt/providers": path.join(dtRoot, "providers"),
      "@dt/types": path.join(dtRoot, "types"),
      fs: { browser: "./src/lib/empty.ts" },
      net: { browser: "./src/lib/empty.ts" },
      tls: { browser: "./src/lib/empty.ts" },
      os: { browser: "./src/lib/empty.ts" },
      path: { browser: "./src/lib/empty.ts" },
    },
  },
};

export default nextConfig;
```

Key changes:
- Deleted `ContextualAliasPlugin` class (60 lines)
- Deleted `webpack` function
- Added `turbopack.resolveAlias` with same `@dt/*` aliases
- Node.js built-in stubs use `{ browser: ... }` conditional (client-only)
- Removed `webpack` and `ResolvePluginInstance`/`Resolver` type imports

---

### Task 6: Clean up console tsconfig.json and package.json

**Files:**
- Modify: `packages/console/tsconfig.json:4-16`
- Modify: `packages/console/package.json:8`

**Step 1: Clean up tsconfig paths**

Replace the `paths` block with:

```json
"paths": {
  "@/*": ["./src/*", "../aleph-sdk/src/*"],
  "@dt/atoms": ["../data-terminal/src/atoms"],
  "@dt/atoms/*": ["../data-terminal/src/atoms/*"],
  "@dt/molecules": ["../data-terminal/src/molecules"],
  "@dt/molecules/*": ["../data-terminal/src/molecules/*"],
  "@dt/hooks/*": ["../data-terminal/src/hooks/*"],
  "@dt/providers/*": ["../data-terminal/src/providers/*"],
  "@dt/lib/*": ["../data-terminal/src/lib/*"],
  "@dt/types/*": ["../data-terminal/src/types/*"]
}
```

Changes:
- Added `@dt/atoms/*` and `@dt/molecules/*` wildcard entries (data-terminal now imports subpaths like `@dt/atoms/hud-label`)
- Removed dead `@/atoms/*`, `@/molecules/*` mappings (no console file uses these)
- Removed data-terminal fallbacks from `@/hooks/*`, `@/lib/*`, `@/types/*` (also unused by console files)

**Step 2: Remove --webpack flag from dev script**

In `package.json`, change:

```json
"dev": "next dev --port 3000",
```

(Remove `--webpack` flag — Turbopack is now the default.)

---

### Task 7: Verify console

**Step 1: TypeScript**

```bash
pnpm --filter console typecheck
```

Expected: passes.

**Step 2: Tests**

```bash
pnpm --filter console test
```

Expected: passes.

**Step 3: Build**

```bash
pnpm --filter console build
```

Expected: passes. This is the critical check — Next.js build uses Turbopack by default in Next.js 16, and all `@dt/*` aliases must resolve.

**Step 4: Dev server smoke test**

```bash
pnpm --filter console dev
```

Expected: starts on port 3000 without `--webpack` flag. Verify in browser that the app loads, sidebar renders, and pages are navigable.

---

### Task 8: Update data-terminal docs

**Files:**
- Modify: `/Users/dio/repos/data-terminal/docs/ARCHITECTURE.md:197,243`
- Modify: `/Users/dio/repos/data-terminal/docs/DESIGN-SYSTEM.md:10,96,454,1165`
- Modify: `/Users/dio/repos/data-terminal/docs/BACKLOG.md:19-22`
- Modify: `/Users/dio/repos/data-terminal/docs/DECISIONS.md`

**Step 1: Update ARCHITECTURE.md**

Line 197 — change `@/atoms/terminal-*`, `@/atoms/corner-notch`, `@/atoms/hover-scanline` to `@dt/atoms/terminal-*`, `@dt/atoms/corner-notch`, `@dt/atoms/hover-scanline`.

Line 243 — change `@/atoms` to `@dt/atoms`.

**Step 2: Update DESIGN-SYSTEM.md**

- Line 10: `from "@/providers/theme-provider"` → `from "@dt/providers/theme-provider"`
- Line 96: `@/atoms/<name>` → `@dt/atoms/<name>`
- Line 454: `@/molecules/<name>` → `@dt/molecules/<name>`
- Line 1165: `@/hooks/<name>` → `@dt/hooks/<name>`

**Step 3: Update BACKLOG.md**

Move the "Use unique internal path prefix to avoid consumer conflicts" item (lines 19-22) from Open Items to the Completed section:

```markdown
### 2026-02-18 - Use unique internal path prefix to avoid consumer conflicts
**Completed:** 2026-02-18
**Delivered:** Renamed all @/ imports to @dt/ prefix. Updated tsconfig paths and vitest alias.
```

**Step 4: Update DECISIONS.md**

Add a new decision entry at the top:

```markdown
## Decision #17 - 2026-02-18
**Context:** data-terminal uses `@/*` internally, which collides with consumers that also use `@/*`. A custom webpack ContextualAliasPlugin resolved this but blocked Turbopack adoption.
**Decision:** Rename all internal imports from `@/` to `@dt/` prefix. Update tsconfig paths to `"@dt/*": ["./src/*"]`.
**Rationale:** `@dt/` is already the alias prefix consumers use to import data-terminal components. Reusing it internally means no new conventions, and consumers can drop their contextual resolver plugins. TypeScript catches any missed renames immediately since the `@/*` path mapping no longer exists.
**Alternatives considered:** Relative imports (noisier paths like `../../lib/cn`), new prefix like `@dt-internal/` (introduces a new convention), pre-building data-terminal (adds build tooling, loses hot-reload)
```

**Step 5: Commit data-terminal docs**

```bash
cd /Users/dio/repos/data-terminal
git add docs/
git commit -m "docs: update references from @/ to @dt/ import prefix"
```

---

### Task 9: Update console docs

**Files:**
- Modify: `docs/ARCHITECTURE.md:92-96`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/BACKLOG.md:33-36`

**Step 1: Update ARCHITECTURE.md**

Replace the "Tailwind CSS 4 + Webpack PostCSS" pattern (lines 92-96) with:

```markdown
### Tailwind CSS 4 + Turbopack
**Context:** Next.js 16 with pnpm monorepo. Tailwind CSS 4 uses `@tailwindcss/postcss` plugin.
**Approach:** `postcss` must be an explicit devDependency (pnpm doesn't hoist transitive deps). Config must be `.cjs` format (`postcss.config.cjs`). The `@source` directive in `globals.css` tells Tailwind to scan data-terminal source files for utility classes. `@dt/*` aliases are configured via `turbopack.resolveAlias` in `next.config.ts`. Node.js built-in stubs (fs, net, tls, os, path) use `{ browser: "./src/lib/empty.ts" }` conditionals for client bundles.
**Key files:** `packages/console/postcss.config.cjs`, `packages/console/src/app/globals.css`, `packages/console/next.config.ts`
**Notes:** data-terminal uses `@dt/` as its internal import prefix (not `@/`), matching the aliases the console configures. This avoids the path collision that previously required a custom webpack resolver plugin.
```

**Step 2: Update DECISIONS.md**

Add a new decision entry at the top:

```markdown
## Decision #9 - 2026-02-18
**Context:** The console dev server ran `next dev --webpack` because a custom `ContextualAliasPlugin` resolved `@/` imports contextually for data-terminal source files. Turbopack has no per-file conditional resolver.
**Decision:** Migrate to Turbopack by standardizing data-terminal's internal imports on the `@dt/` prefix (already used by console to import DT components). Delete the ContextualAliasPlugin, replace webpack config with `turbopack.resolveAlias`, remove `--webpack` flag.
**Rationale:** Turbopack is significantly faster for dev compilation. The `@dt/` prefix already exists as the console's alias convention for data-terminal — reusing it internally eliminates the collision without introducing new conventions. TypeScript catches any missed renames since data-terminal's tsconfig no longer maps `@/*`.
**Alternatives considered:** Relative imports in data-terminal (noisier, 140+ edits for worse DX), new `@dt-internal/` prefix (new convention), pre-building data-terminal (adds build step, loses hot-reload)
```

**Step 3: Update BACKLOG.md**

Move the "Migrate webpack ContextualAliasPlugin to Turbopack" item (lines 33-36) from Open Items to the Completed section:

```markdown
### 2026-02-18 - Migrate webpack ContextualAliasPlugin to Turbopack
**Completed:** 2026-02-18
**Delivered:** Renamed data-terminal @/ imports to @dt/ prefix. Replaced webpack ContextualAliasPlugin with turbopack.resolveAlias. Removed --webpack flag from dev script. Added Node.js built-in stubs via browser-conditional aliases.
```

**Step 4: Commit console changes**

```bash
git add -A
git commit -m "refactor: migrate from webpack to Turbopack

Replace ContextualAliasPlugin with turbopack.resolveAlias by
standardizing data-terminal imports on the @dt/ prefix. Remove
--webpack flag from dev script. Stub Node.js built-ins via
browser-conditional aliases."
```

---

### Task 10: Final verification

**Step 1: Full build from monorepo root**

```bash
pnpm build
```

Expected: both packages build successfully.

**Step 2: Full test from monorepo root**

```bash
pnpm test
```

Expected: all tests pass.
