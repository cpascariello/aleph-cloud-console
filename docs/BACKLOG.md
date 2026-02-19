# Backlog

Ideas and scope creep captured for later consideration.

---

## How Items Get Here

- Scope drift detected during focused work (active interrupt)
- Ideas that come up but aren't current priority
- "We should also..." moments
- Features identified but deferred

---

## Open Items

### 2026-02-17 - CLI companion tool
**Source:** Identified during SDK extraction design
**Description:** The extracted aleph-sdk package could power a CLI tool for deploying resources from the terminal. Same managers, no React.
**Priority:** Low

### 2026-02-17 - Real-time WebSocket updates
**Source:** Identified during monitoring page design
**Description:** Replace polling with WebSocket/SSE for real-time status updates. Current design uses React Query polling (5s/30s intervals). WebSockets would give instant feedback.
**Priority:** Medium

### 2026-02-17 - Resource cost analytics
**Source:** Identified during billing page design
**Description:** Historical cost tracking, spend trends, cost forecasting. The billing page currently only shows current state. Time-series data would help users optimize spending.
**Priority:** Medium

### 2026-02-17 - Component-level tests for wallet and payment UI
**Source:** Identified during Phase 6 code review
**Description:** Tests for `WalletButton`, `ChainBadge`, `PaymentMethodToggle`, `CostBreakdown`, `InsufficientFundsAlert`, `CheckoutSummary`. Deferred until React testing infrastructure (RTL + context wrapper utilities) is set up.
**Priority:** Medium

### 2026-02-19 - Consolidate `date` and `created_at` on Website type
**Source:** Identified during website detail page redesign code review
**Description:** The `Website` type has both `date` and `created_at` fields set to the same value. The `date` field exists for backward compatibility with list page sort logic. Once the list page uses `created_at` directly, `date` can be removed.
**Priority:** Low

### 2026-02-19 - Website version history UI
**Source:** Identified during website detail page redesign
**Description:** The live console shows previous versions with redeploy actions and legacy gateway URLs. Our redesign covers the current version only. Add a "Previous Versions" section that lists volume history entries with version numbers, sizes, and redeploy buttons.
**Priority:** Medium

### 2026-02-19 - Two-column card layout for all detail pages
**Source:** Identified during website detail page layout improvement
**Description:** Apply the two-column card grid pattern used on the website detail page to all resource detail pages (instance, volume, domain). Layout: one full-width card at the top, then a `grid-cols-1 lg:grid-cols-2` grid for remaining cards below. Each page will need its own grouping logic based on which cards it has.
**Priority:** Medium

### 2026-02-19 - Fix TypeScript errors in data-terminal button.tsx
**Source:** Identified during website detail page typecheck
**Description:** Two pre-existing type errors in `data-terminal/src/molecules/button.tsx:89`. These are in the design system repo, not the console. They don't block dev or build (transpiled as source), but they fail `tsc --noEmit` for the console package.
**Priority:** Low

### 2026-02-17 - Multi-account support
**Source:** Not in current scope but frequently requested
**Description:** Support switching between multiple wallet accounts without disconnecting. Shared dashboard across accounts.
**Priority:** Low

---

## Completed / Rejected

### 2026-02-18 - Fix Next.js 16 Turbopack config for external symlink
**Completed:** 2026-02-18
**Delivered:** Turbopack-only config (no webpack). Three fixes: (1) `turbopack.root` set to computed common ancestor of monorepo and data-terminal real paths so Turbopack accepts files from both repos. (2) `packages/data-terminal` symlink changed from absolute path through `~/repos` (intermediate symlink) to relative `../../data-terminal` that resolves directly within the real filesystem — Turbopack doesn't fully resolve chained symlinks. (3) `tailwindcss` added to `resolveAlias` to fix CSS `@import` resolution with expanded root. Removed ContextualAliasPlugin and all webpack config.

<details>
<summary>Archived items</summary>

<!-- Completed items moved here with checkmark and date -->

</details>
