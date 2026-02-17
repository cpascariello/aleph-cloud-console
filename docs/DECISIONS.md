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
