# Architecture

Technical patterns and decisions.

---

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 (strict) |
| Styling | Tailwind CSS 4 + data-terminal design system |
| State (server) | TanStack React Query |
| State (forms) | React Hook Form + Zod |
| State (wallet) | Reown SDK |
| Icons | Lucide React |
| Testing | Vitest |

---

## Project Structure

```
aleph-cloud-console/          # Monorepo root
  packages/
    aleph-sdk/                # Domain logic (framework-agnostic)
      src/
        managers/             # Entity managers (InstanceManager, VolumeManager, etc.)
        types/                # Entity types, enums
        schemas/              # Zod validation schemas
        constants.ts          # API URLs, channels, blockchain addresses
    console/                  # Next.js 16 app
      src/
        app/(console)/        # Console layout group
        components/           # UI components
        hooks/                # React Query hooks, mutations, utility hooks
        providers/            # Context providers
        lib/                  # Utilities
```

---

## Patterns

### Entity Manager Pattern (SDK)
**Context:** All Aleph network resources follow the same CRUD + multi-step signing pattern.
**Approach:** Each resource type has a manager class implementing `EntityManager<T, AT>` with `getAll`, `get`, `add`, `del`, and async generator variants (`addSteps`, `delSteps`) that yield at each wallet signature step.
**Key files:** `packages/aleph-sdk/src/managers/`
**Notes:** Managers are framework-agnostic. The React layer wraps them in React Query hooks.

### React Query for Server State
**Context:** All console state comes from the Aleph network (server state). Need caching, background refetching, optimistic updates.
**Approach:** One `useQuery` hook per entity type, one `useMutation` per action. Cascade invalidation via `queryClient.invalidateQueries()`.
**Key files:** `packages/console/src/hooks/queries/`, `packages/console/src/hooks/mutations/`
**Notes:** No Redux or global store. URL params for UI state (filters, pagination).

### Wizard Pattern
**Context:** Resource creation involves multi-step forms with validation, cost estimation, and blockchain signing.
**Approach:** Shared `useWizard` hook manages step state, per-step validation, and localStorage draft auto-save. Each resource type defines its own steps.
**Key files:** `packages/console/src/components/wizard/`, `packages/console/src/hooks/use-wizard.ts`

### Design System Integration
**Context:** data-terminal provides 24 atoms + 31 molecules with a cyberpunk/terminal aesthetic.
**Approach:** Components imported via path aliases (`@dt/atoms`, `@dt/molecules`) or barrel re-export. Console uses data-terminal as source (transpiled by Next.js), not as a published package.
**Key files:** `packages/console/src/components/data-terminal.ts` (barrel), `~/repos/data-terminal/src/`

### Wallet Connection Pattern
**Context:** Users connect wallets to sign transactions and pay for resources. Support 4 chains: ETH, AVAX, BASE, SOL.
**Approach:** Reown AppKit initialized at module scope (SSR-safe). `WalletProvider` wraps the app and exposes `WalletState` via React context. `ManagersProvider` consumes `useWallet()` internally to resolve Aleph Account. Provider type guards (`isEip155Provider`, `isSolanaProvider`) distinguish EVM vs Solana wallets.
**Provider order:** `QueryProvider > WalletProvider > ManagersProvider > ThemeProvider > ToastProvider`
**Key files:** `packages/console/src/providers/wallet-provider.tsx`, `packages/console/src/providers/managers-provider.tsx`, `packages/aleph-sdk/src/types/provider.ts`

### Payment & Cost Estimation Pattern
**Context:** Resource creation wizards need to show costs and check if the user can afford them before deploying.
**Approach:** Two-layer system. SDK layer: `BalanceManager` fetches ALEPH balance from pyaleph API (all chains), `CostManager` provides pricing aggregates. React layer: `useCostEstimate` computes costs from pricing + form params, `useCanAfford` checks balance vs cost. UI layer: `CheckoutSummary` composite component composes PaymentMethodToggle + CostBreakdown + InsufficientFundsAlert. Pure computation functions exported for testing.
**Key files:** `packages/aleph-sdk/src/managers/balance.ts`, `packages/console/src/hooks/use-cost-estimate.ts`, `packages/console/src/hooks/use-can-afford.ts`, `packages/console/src/components/payment/checkout-summary.tsx`
**Data flow:** `useWizard form state -> CheckoutSummary -> useCostEstimate(form values) -> CostManager -> CostSummary` and `useCanAfford(cost, paymentMethod) -> BalanceManager -> canAfford`

### Resource List Pattern
**Context:** All resource list pages (compute, volumes, domains, websites, SSH keys) share the same interaction model: search, filter, sort, paginate, select, bulk actions.
**Approach:** `useResourceList<T>` generic hook manages all list state via URL search params. Each page provides `getId`, `searchFn`, `filterFn`, and `sortFn` callbacks. Pagination is fixed at 25 items. Selection state is local (not URL).
**Key files:** `packages/console/src/hooks/use-resource-list.ts`, `packages/console/src/components/resources/`
**Notes:** Shared presentational components (`ResourceFilterBar`, `ResourcePagination`, `ResourceEmptyState`, `BulkActionBar`, `DeleteConfirmationModal`) compose with the hook. Each page maps its entity data to `RowShape` objects for `DataTable`.

### Resource Detail Page Pattern
**Context:** All resource types need detail views with consistent structure: back link, header with status/actions, tabbed content, delete confirmation.
**Approach:** Each detail page uses `use(params)` to unwrap Next.js 16 async params. Shared layout: back link → header (icon, name, StatusDot, Badge, CopyButton for ID) → `TerminalTabs` with Overview + Settings tabs. Settings tab always contains a danger zone with `DeleteConfirmationModal`. Instance detail has 4 tabs (overview, logs, networking, settings) with extracted tab components. Simpler resources inline their tab content.
**Key files:** `packages/console/src/app/(console)/compute/[id]/page.tsx`, `packages/console/src/components/compute/detail/`, `packages/console/src/app/(console)/infrastructure/*/[id]/page.tsx`
**Notes:** Volume delete uses `highRisk` prop on `DeleteConfirmationModal` for type-to-confirm. Instance actions (start/stop/reboot) use `useInstanceActions` mutation hook.

### Tailwind CSS 4 + Turbopack
**Context:** Next.js 16 with pnpm monorepo. Tailwind CSS 4 uses `@tailwindcss/postcss` plugin.
**Approach:** `postcss` must be an explicit devDependency (pnpm doesn't hoist transitive deps). Config must be `.cjs` format (`postcss.config.cjs`). The `@source` directive in `globals.css` tells Tailwind to scan data-terminal source files for utility classes. `@dt/*` aliases are configured via `turbopack.resolveAlias` in `next.config.ts`. Node.js built-in stubs (fs, net, tls, os, path) use `{ browser: "./src/lib/empty.ts" }` conditionals for client bundles.
**Key files:** `packages/console/postcss.config.cjs`, `packages/console/src/app/globals.css`, `packages/console/next.config.ts`
**Notes:** data-terminal uses `@dt/` as its internal import prefix (not `@/`), matching the aliases the console configures. This avoids the path collision that previously required a custom webpack resolver plugin. The `outputFileTracingRoot` is dynamically computed to encompass both the monorepo and the symlinked data-terminal target. `typescript: { ignoreBuildErrors: true }` is set because the wider root exposes pre-existing data-terminal type errors — the console's `pnpm typecheck` script handles type checking properly.

---

## Recipes

### Adding a New Resource Type

1. Define types in `packages/aleph-sdk/src/types/[resource].ts`
2. Create Zod schema in `packages/aleph-sdk/src/schemas/[resource].ts`
3. Create manager in `packages/aleph-sdk/src/managers/[resource].ts`
4. Add to factory in `packages/aleph-sdk/src/managers/factory.ts`
5. Create query hook in `packages/console/src/hooks/queries/use-[resource]s.ts`
6. Create mutation hooks in `packages/console/src/hooks/mutations/use-[resource]-actions.ts`
7. Create list page at `packages/console/src/app/(console)/[section]/[resource]s/page.tsx`
8. Create detail page at `packages/console/src/app/(console)/[section]/[resource]s/[id]/page.tsx`
9. Create wizard at `packages/console/src/app/(console)/[section]/[resource]s/new/page.tsx`
10. Add to sidebar config in `packages/console/src/components/shell/sidebar-config.ts`

### Adding a New Wizard Step

1. Create step component in the resource's `wizard/` directory
2. Add to the page's steps array with label and validation schema
3. The `useWizard` hook handles navigation, validation, and auto-save automatically
