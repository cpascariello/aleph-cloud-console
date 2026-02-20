# Decisions Log

Key decisions made during development. When you wonder "why did we do X?", the answer should be here.

---

## How Decisions Are Logged

Decisions are captured when these phrases appear:
- "decided" / "let's go with" / "rejected"
- "choosing X because" / "not doing X because"
- "actually, let's" / "changed my mind"

Each entry includes:
- Context (what we were working on)
- Decision (what was chosen)
- Rationale (why - the most important part)

---

## Decision #19 - 2026-02-20
**Context:** Wiring the website wizard to actually deploy. The `handleComplete` callback closed the drawer/redirected but never called the SDK mutation. Two sub-decisions emerged during implementation.
**Decision:** (1) Use manual generator iteration (`while`/`next()`) instead of `for await` to capture the created entity from `addSteps()`. (2) Post-deploy, redirect to the website detail page instead of the list page.
**Rationale:** (1) `for await` discards the generator's return value. Calling `websiteManager.get(name)` after the loop races with API aggregate indexing — the website may not be indexed yet, returning `undefined` and crashing on `.id` access. Manual iteration (same pattern as `WebsiteManager.add()`) gets the entity directly from the generator return. (2) The list page doesn't immediately show the new website (query cache race), which feels broken. The detail page handles pending states gracefully (skeleton, "Pending" badge, volume-missing alert) so it's a natural landing page.
**Alternatives considered:** (1) Adding a retry/delay to `get()` (rejected: fragile, generator already has the data). (2) Redirecting to list page (rejected: new website not visible yet, confusing UX).

## Decision #18 - 2026-02-19
**Context:** Instance status badges showed on-chain confirmation state, not real CRN execution state. Needed to show real status on both list and detail pages.
**Decision:** Three simplified badge states (Running, Booting, Stopped) plus Not Allocated and Unknown. Alert banner between header and tabs for non-running states on detail pages. Per-instance CRN polling on list page (60s interval). Established Detail Page Alert Pattern as cross-cutting pattern for all resource detail pages.
**Rationale:** Full lifecycle granularity (7 states) is too noisy for badges. Simplified states are scannable; alert banner provides detail when something needs attention. Per-instance polling is feasible for ≤20 instances. Alert pattern between header and tabs is visible regardless of active tab, only renders when needed, and uses existing Alert component.
**Alternatives considered:** Full granularity badges (rejected: too many states, hard to scan). Status in overview card (rejected: hidden in tab content). Batch status API (rejected: doesn't exist on Aleph network).

## Decision #17 - 2026-02-19
**Context:** Instance detail page missing general information. Payment data (type, chain) displayed inline vs separate tab.
**Decision:** Payment gets its own tab (between Networking and Settings). Overview tab restructured to vertical card stack (Instance Details + SSH Keys). Hold/PAYG payment display kept minimal (type + chain only) since credits will replace them.
**Rationale:** Payment as a dedicated tab gives room for the upcoming credits system without cluttering overview. Minimal payment display avoids investing in UI for a payment model being phased out.
**Alternatives considered:** Payment inline in overview card (rejected — cramped, no room for credits expansion). Full Superfluid stream details (rejected — credits replacing hold/stream soon).

## Decision #16 - 2026-02-19
**Context:** Website detail page showed a broken URL pointing to `localhost:3000/storage/volume/{id}` and was missing gateway URLs, IPFS CIDs, version info, and ENS setup instructions compared to the live console.
**Decision:** Fetch the volume entity to get the IPFS CID from `volume.item_hash` (StoreContent), not from `website.volume_id` (Aleph message hash). Redesign the detail page with full parity: info row, default/alternative/ENS gateways, and current version card.
**Rationale:** The `volume_id` stored in website aggregates is the Aleph message hash (hex), not the IPFS CID. These are two distinct hashes. The IPFS CID lives on the volume entity's `item_hash` field from `StoreContent`. Attempting CID conversion on the hex hash silently fails. The reference codebase fetches the volume entity to get `item_hash` and converts that.
**Alternatives considered:** Storing the IPFS CID directly in the website aggregate (rejected: would require aggregate migration and break backward compatibility with existing websites). Computing the CID from the hex hash (impossible: they're unrelated hashes).

## Decision #15 - 2026-02-19
**Context:** The `WebsiteAggregateItem` type had incorrect fields (`type`, `programType`, `message_id`, top-level `framework`, top-level `name`) that didn't match the actual aggregate data stored by the API. Fields like `version`, `ens`, `created_at` existed in the data but were being discarded during parsing.
**Decision:** Rewrite the type to match reality: `metadata` wrapper for `name`/`tags`/`framework`, plus `version`, `ens`, `created_at` at the top level. Update the parser and the `updateSteps` write path to use the same structure.
**Rationale:** The aggregate content is written by `addSteps` with `metadata: { name, tags, framework }` at the nested level. The parser must read from the same structure it writes. The `updateSteps` method was also writing flat `name`/`framework` which would cause metadata loss after updates.
**Alternatives considered:** None — this was a correctness fix, not a design choice.

## Decision #14 - 2026-02-18
**Context:** All resource list pages (volumes, instances, programs, domains, SSH keys, websites) showed empty data with no loading indicator on page refresh or initial wallet connection. Queries fired immediately on mount before the wallet account resolved, caching empty results. React Query's invalidation (triggered when the account later resolved) raced with the in-flight initial fetch, and deduplication prevented a proper refetch with the authenticated manager.
**Decision:** Gate all user-specific list queries with `enabled: !!accountAddress`, include the account address in query keys, and use `isPending` instead of `isLoading` in consuming components.
**Rationale:** Three-layer fix: (1) `enabled` prevents queries from firing before the account is available, eliminating the race condition entirely. (2) Account address in query keys gives each account its own cache entry, preventing stale data when switching wallets. (3) `isPending` correctly shows skeleton states both when the query is disabled (waiting for account) and when it's actively fetching — `isLoading` (`isPending && isFetching`) is false when disabled, which would incorrectly show the empty state.
**Alternatives considered:** Only using `invalidateQueries` with `cancelRefetch: true` (rejected: still races if the initial fetch hasn't started yet). Adding `enabled: isConnected` (rejected: `isConnected` becomes true before the account resolves, leaving a timing gap). Removing `staleTime` (rejected: treats the symptom, not the cause).

## Decision #13 - 2026-02-18
**Context:** Dashboard redesign — deciding layout for connected vs disconnected wallet states.
**Decision:** Two-column layout when connected (main content + 320px sticky sidebar). Single-column marketing page when disconnected showing public network stats and connect CTA.
**Rationale:** The previous single-column layout stacked everything vertically, making actionable shortcuts (quick actions, quick links) hard to find below the fold. The sidebar keeps actions always visible. Disconnected users see useful public data (network stats) instead of empty loading skeletons, with a clear call to connect.
**Alternatives considered:** Single column with reordered sections (rejected: quick actions still pushed below fold on data-heavy dashboards). Full-width dashboard with floating action panel (rejected: more complex responsive behavior).

## Decision #12 - 2026-02-18
**Context:** All Card/TerminalCard components showed hover glow (border color change + shadow) and scanline animation on hover, even when purely informational. Users perceived informational cards as clickable.
**Decision:** Add `interactive` prop to Card and TerminalCard (default `false`). Hover glow and scanline only render when `interactive={true}`. Only template selection and tier selection cards opt in.
**Rationale:** Hover effects signal interactivity. Applying them to informational cards (detail panels, dashboards, wizard containers) is misleading UX. Most cards in the console are informational, so default-off minimizes changes. The scanline default derives from `interactive` but can be overridden independently via the existing `scanline` prop.
**Alternatives considered:** Default `interactive={true}` with opt-out (rejected: more changes needed, wrong default for the majority of usages).

## Decision #11 - 2026-02-18
**Context:** Exploring how to improve wizard/creation flow UX. Four approaches compared: side panel for everything, hybrid, split view, improved full-page only.
**Decision:** Hybrid approach — side panel drawer for simple wizards (volume, domain, website) and contextual actions (from instance detail), improved full-page for complex wizards (instance).
**Rationale:** Instance wizard (5 steps, template grid, SSH keys, deploy progress) needs full width. Simple 2-3 step wizards fit in 460px. Contextual creation from detail pages (add domain/volume to instance) must stay in context. One-size-fits-all either cramps complex forms or over-engineers simple ones.
**Alternatives considered:** Side panel for everything (rejected: instance wizard too complex for 460px). Split view (rejected: doesn't work from detail pages, complex responsive). Improved full-page only (rejected: doesn't solve contextual creation).

## Decision #10 - 2026-02-18
**Context:** Adding breadcrumbs to replace large page titles. Initial implementation put the entire breadcrumb component (rendering + route derivation) in the console app.
**Decision:** Reusable UI primitives go in the design system; app-specific wiring stays in the console. Breadcrumbs molecule (props in, JSX out) lives in data-terminal. PageHeader (derives crumbs from usePathname + sidebar config, sets document.title) lives in the console.
**Rationale:** The design system is the single source of truth for visual patterns. Putting a generic navigation component in the console would create a precedent for bypassing the design system whenever a component is "only used here." Every generic component starts as "only used here."
**Alternatives considered:** All-in-console (rejected: breaks design system boundary, harder to reuse). All-in-design-system including route logic (rejected: couples design system to Next.js).

## Decision #9 - 2026-02-18
**Context:** The console dev server ran `next dev --webpack` because a custom `ContextualAliasPlugin` resolved `@/` imports contextually for data-terminal source files. Turbopack has no per-file conditional resolver.
**Decision:** Migrate to Turbopack by standardizing data-terminal's internal imports on the `@dt/` prefix (already used by console to import DT components). Delete the ContextualAliasPlugin, replace webpack config with `turbopack.resolveAlias`, remove `--webpack` flag.
**Rationale:** Turbopack is significantly faster for dev compilation. The `@dt/` prefix already exists as the console's alias convention for data-terminal — reusing it internally eliminates the collision without introducing new conventions. TypeScript catches any missed renames since data-terminal's tsconfig no longer maps `@/*`.
**Alternatives considered:** Relative imports in data-terminal (noisier, 140+ edits for worse DX), new `@dt-internal/` prefix (new convention), pre-building data-terminal (adds build step, loses hot-reload)

## Decision #8 - 2026-02-17
**Context:** Tailwind CSS 4 produced zero styling in the browser — all directives (`@import "tailwindcss"`, `@source`, `@theme inline`, `@apply`) passed through raw and unprocessed.
**Decision:** Add `postcss` as an explicit devDependency and use `postcss.config.cjs` (CommonJS) instead of `.mjs`.
**Rationale:** pnpm's strict `node_modules` doesn't hoist transitive dependencies. `postcss` was only a transitive dep of `@tailwindcss/postcss`, so webpack's postcss-loader couldn't find it. The `.mjs` config format also caused ESM resolution issues with webpack's postcss-loader. Both failures were silent — no error, just unprocessed CSS.
**Alternatives considered:** Switching to Turbopack (rejected: need webpack for ContextualAliasPlugin that resolves `@/` imports differently for data-terminal vs console). Inlining all theme CSS into globals.css (rejected: worse maintainability).

## Decision #7 - 2026-02-17
**Context:** Sidebar navigation structure for the console
**Decision:** Flatten compute types into tabs within a single Compute page. Merge Storage + Networking into "Infrastructure" group. Move SSH Keys into Compute group.
**Rationale:** Reduces sidebar from 12 items to 9. Compute types are a filtering concern, not navigation. SSH keys are compute-related. Volumes, domains, and websites are all infrastructure.
**Alternatives considered:** Separate sidebar items per compute type (rejected: too many items). Separate Storage and Networking groups (rejected: each would have only 1-2 items).

## Decision #6 - 2026-02-17
**Context:** How to integrate data-terminal design system
**Decision:** Use path aliases and transpilePackages to import data-terminal as source, not as a published npm package.
**Rationale:** Both projects are in active development. Source imports allow iterating on both simultaneously without publish cycles. Next.js transpilePackages handles the compilation.
**Alternatives considered:** Publishing data-terminal to npm (rejected: too much friction during co-development). Copying components into console (rejected: duplication).

## Decision #5 - 2026-02-17
**Context:** State management approach for the new console
**Decision:** React Query for server state. No Redux or global store.
**Rationale:** Almost all console state is server state (Aleph network data). React Query handles caching, refetching, invalidation, optimistic updates, and loading/error states natively. The current app builds all of this manually with Context+useReducer. URL params handle UI state (filters, sort, pagination) making views shareable and bookmarkable.
**Alternatives considered:** Keep Context+useReducer (rejected: too much boilerplate for server state). Redux Toolkit + RTK Query (rejected: more complexity than needed).

## Decision #4 - 2026-02-17
**Context:** Creation flow UX for compute resources
**Decision:** Step-by-step wizard with templates as the first step. Progressive disclosure for specs (tier cards + expandable custom config).
**Rationale:** Current app uses a long single-page form with 5-6 sections. Wizards reduce cognitive load per step, enable per-step validation, and support draft auto-save. Templates as the first step means newcomers can deploy in 2 clicks (pick template -> review -> deploy). Power users expand custom config in step 2.
**Alternatives considered:** Keep single-page form (rejected: too overwhelming for mixed audience). Modal-based config (rejected: loses context).

## Decision #3 - 2026-02-17
**Context:** Delete confirmation UX
**Decision:** Two-tier confirmation: type-to-confirm for high-risk resources (instances, volumes), simple confirm/cancel for lower-risk (domains, SSH keys).
**Rationale:** Current app has zero delete confirmations. Wallet signature is the only gate, but users can auto-sign. High-risk deletions need friction. Lower-risk items don't need the typing step.

## Decision #2 - 2026-02-17
**Context:** Overall architecture approach for the new console
**Decision:** Terminal-first dashboard (persistent sidebar, command palette, card-based dashboards) combined with wizard-driven creation flows.
**Rationale:** Terminal-first leans into the data-terminal aesthetic and serves power users via command palette (Cmd+K). Wizard-driven creation flows serve newcomers with step-by-step guidance. This hybrid satisfies the mixed audience requirement (developers through non-technical founders).
**Alternatives considered:** Pure wizard-driven (rejected: doesn't leverage terminal aesthetic). Hybrid workspace with resizable panels (rejected: too complex, poor mobile experience).

## Decision #1 - 2026-02-17
**Context:** Starting the new console project
**Decision:** Full rewrite using data-terminal design system, not incremental migration.
**Rationale:** The tech stack is fundamentally different (Pages Router + styled-components -> App Router + Tailwind CSS 4). An incremental migration would require maintaining two styling approaches simultaneously. A clean rewrite lets us rethink product scope (add monitoring, templates, marketplace) and fix all UX issues at once.
**Alternatives considered:** Incremental migration (rejected: dual styling systems). Same features only (rejected: opportunity to improve product scope).
