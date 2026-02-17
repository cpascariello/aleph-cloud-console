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

### 2026-02-17 - Migrate webpack ContextualAliasPlugin to Turbopack
**Source:** Identified during Phase 6 — slow dev compilation
**Description:** The `ContextualAliasPlugin` in `next.config.ts` is a webpack-only resolver plugin that contextually resolves `@/` imports for data-terminal. This forces `next dev --webpack` mode, which is significantly slower than Turbopack. Migrate to Turbopack's `resolveAlias` config so the `--webpack` flag can be dropped. Also eliminates the need for `transpilePackages`.
**Priority:** High

### 2026-02-17 - Component-level tests for wallet and payment UI
**Source:** Identified during Phase 6 code review
**Description:** Tests for `WalletButton`, `ChainBadge`, `PaymentMethodToggle`, `CostBreakdown`, `InsufficientFundsAlert`, `CheckoutSummary`. Deferred until React testing infrastructure (RTL + context wrapper utilities) is set up.
**Priority:** Medium

### 2026-02-17 - Multi-account support
**Source:** Not in current scope but frequently requested
**Description:** Support switching between multiple wallet accounts without disconnecting. Shared dashboard across accounts.
**Priority:** Low

---

## Completed / Rejected

<details>
<summary>Archived items</summary>

<!-- Completed items moved here with checkmark and date -->

</details>
