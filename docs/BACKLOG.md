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

### 2026-02-17 - data-terminal: Add `linkComponent` prop to Sidebar and Navbar
**Source:** Identified during console Phase 1 integration
**Description:** Sidebar and Navbar render native `<a>` tags for items with `href`. In Next.js, this causes full page reloads instead of client-side navigation. A `linkComponent` prop (accepting a component like Next's `<Link>`) would let consumers provide their own anchor implementation. Current workaround: intercept clicks on the parent `<div>` and call `router.push()`. This works but is fragile.
**Priority:** High

### 2026-02-17 - data-terminal: Duplicate @types/react when consumed as source
**Source:** Identified during console Phase 0 typecheck
**Description:** When data-terminal is symlinked into a consumer project and imported as source (via `transpilePackages`), tsc resolves `@types/react` from both locations, causing `Ref` type incompatibilities in `button.tsx`. The consumer's typecheck script must filter out data-terminal errors. Fix options: (1) publish data-terminal with declarations, (2) add TypeScript project references with `composite: true`, (3) consumer deduplicates via pnpm overrides.
**Priority:** Medium

### 2026-02-17 - data-terminal: Internal `@/` path conflicts with consumer projects
**Source:** Identified during console Phase 0 typecheck
**Description:** Data-terminal uses `@/*` → `./src/*` internally. When a consumer also uses `@/*`, tsc can't contextually resolve the prefix. Webpack works via a custom `ContextualAliasPlugin`, but tsc needs explicit fallback path mappings (e.g., `"@/atoms/*": ["../data-terminal/src/atoms/*"]`). Consider using a unique prefix like `~dt/` or `#/` internally, or publishing with declarations to avoid source-level path conflicts.
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
