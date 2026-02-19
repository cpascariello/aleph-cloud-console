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

### 2026-02-19 - Instance status badge should reflect CRN execution state
**Source:** Identified during connection methods implementation
**Description:** The "Running"/"Pending" badge on instance list and detail pages uses `instance.confirmed` (message confirmed on-chain), not actual CRN execution status. An instance can be confirmed but not allocated to any CRN. The real status comes from `ExecutableManager.checkStatus()` which calls the CRN. Fixing this requires either per-instance CRN status checks (expensive for list views) or a batch status endpoint. The connection methods card already fetches CRN status — that data could feed the detail page badge, but the list view needs a different approach.
**Priority:** High

### 2026-02-19 - Instance detail: Explorer link should point to wallet address
**Source:** Identified during connection methods testing
**Description:** The explorer link on the instance overview tab currently points to the instance `item_hash`, which doesn't show useful information on the explorer. It should either point to an explorer page with relevant instance information, or fall back to the wallet address explorer page (e.g., `https://explorer.aleph.im/address/{sender}`). Requires checking what the Aleph explorer supports for instance/message views and updating `getExplorerURL` in the SDK accordingly.
**Priority:** Low

### 2026-02-19 - Instance detail: Live logs with wallet signature
**Source:** Comparison with live console (v1) — screenshot 03
**Description:** Logs tab currently shows placeholder data. Real implementation: "View" button opens sliding panel with Stdout/Stderr sections, "Download logs" link. Both require wallet signature to authenticate with the CRN. Need to implement log fetching API, wallet signing flow, and streaming display.
**Priority:** High

### 2026-02-19 - Instance detail: Custom domain DNS configuration warnings
**Source:** Comparison with live console (v1) — screenshot 04
**Description:** When a custom domain is linked to an instance but DNS records aren't configured, show a warning badge ("DOMAIN RECORDS NOT CONFIGURED") and pending steps: (1) CNAME record instruction, (2) TXT owner proof record with wallet address. Include a "Retry" button to re-check. The domain detail page in v1 shows this — we need it surfaced on the instance detail too.
**Priority:** Medium

### 2026-02-19 - Credits payment system
**Source:** Identified during instance detail general info brainstorming
**Description:** Hold/PAYG (Superfluid stream) payment methods will be replaced by a credits system. The SDK and console don't account for credits yet. Needs: new payment type in SDK constants, cost estimation updates, wizard payment step changes, and detail page display. Showing payment.type + chain now will help distinguish old (hold/stream) from new (credits) resources in the future.
**Priority:** High

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

### 2026-02-19 - Instance detail: Connection methods (IPv4/IPv6 + port forwarding)
**Completed:** 2026-02-19
**Delivered:** Networking tab now shows Connection Methods card (IPv4/IPv6 tabs with SSH commands + IP addresses, copy buttons) and Port Forwarding table (read-only source/dest/protocol). Uses `useExecutableStatus` hook (30s CRN polling) and `useForwardedPorts` hook (aggregate + CRN merge). Two distinct error states: not allocated vs CRN unreachable. Port management (add/remove) deferred.

### 2026-02-19 - Instance detail: General information section
**Completed:** 2026-02-19
**Delivered:** Overview tab rewritten as vertical card stack: Instance Details card (item hash with copy, specs row, explorer link, created date) + SSH Keys card (cross-referenced with user's key list for names). New Payment tab (type Hold/Stream, blockchain name, start date). Fixed sidebar resources field access bug.

### 2026-02-19 - Unified detail page template for all resources
**Completed:** 2026-02-19
**Delivered:** All four detail pages (domain, volume, website, instance) refactored to a unified layout: dashboard-style sidebar (`grid-cols-[1fr_320px]`) with Info Summary, Actions, and Related Resources cards. Standardized tabs (Overview + Settings minimum). Consistent header pattern. Delete moved from header to sidebar + Settings danger zone. Removed unused `DetailHeader` component.

### 2026-02-18 - Fix Next.js 16 Turbopack config for external symlink
**Completed:** 2026-02-18
**Delivered:** Turbopack-only config (no webpack). Three fixes: (1) `turbopack.root` set to computed common ancestor of monorepo and data-terminal real paths so Turbopack accepts files from both repos. (2) `packages/data-terminal` symlink changed from absolute path through `~/repos` (intermediate symlink) to relative `../../data-terminal` that resolves directly within the real filesystem — Turbopack doesn't fully resolve chained symlinks. (3) `tailwindcss` added to `resolveAlias` to fix CSS `@import` resolution with expanded root. Removed ContextualAliasPlugin and all webpack config.

<details>
<summary>Archived items</summary>

<!-- Completed items moved here with checkmark and date -->

</details>
