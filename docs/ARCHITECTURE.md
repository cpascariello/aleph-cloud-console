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

**Account-gated queries:** All user-specific list queries (`useVolumes`, `useInstances`, `usePrograms`, `useDomains`, `useSSHKeys`, `useWebsites`) are gated with `enabled: !!accountAddress` and include the account address in their query key. This prevents queries from firing before the wallet account resolves (race condition with auto-reconnect) and ensures each account gets its own cache entry. Public queries (`useNetworkStats`, `usePricing`) have no account gate. Components consuming gated queries use `isPending` (not `isLoading`) for skeleton states — `isPending` is true both when the query is disabled (waiting for account) and when it's actively fetching for the first time.

### Wizard Pattern
**Context:** Resource creation involves multi-step forms with validation, cost estimation, and blockchain signing.
**Approach:** Hybrid approach — simple wizards (volume, domain, website, ≤3 steps) render in a side-panel drawer for in-context creation, while complex wizards (instance, 5+ steps) stay full-page with wider layout (`max-w-5xl`). `WizardShell` accepts a `variant` prop (`'page'` | `'drawer'`) that controls chrome rendering. Wizard logic is extracted into content components (`VolumeWizardContent`, `DomainWizardContent`, `WebsiteWizardContent`) that render in both contexts. `useWizard` hook manages step state, per-step validation, and localStorage draft auto-save.
**Key files:** `packages/console/src/components/wizard/wizard-shell.tsx`, `packages/console/src/hooks/use-wizard.ts`, `packages/console/src/components/infrastructure/*-wizard-content.tsx`

### Drawer Pattern
**Context:** Simple wizards (volume, domain, website) and contextual actions (adding domain/volume from instance detail) need to stay in context rather than navigating away.
**Approach:** TerminalDrawer (from data-terminal) renders in ConsoleShell at z-[45]. DrawerProvider + useDrawer hook manage open/close state with arbitrary content. List pages and detail pages open wizards in the drawer via onClick handlers. Deep link support via `?wizard=type` search params; `/new` routes redirect to list pages with the param.
**Key files:** `data-terminal/src/molecules/drawer.tsx`, `console/src/providers/drawer-provider.tsx`, `console/src/hooks/use-drawer.ts`, `console/src/components/shell/console-shell.tsx`
**Notes:** Complex wizards (instance, 5+ steps) stay full-page. Simple wizards (≤3 steps) use the drawer. The same wizard content component renders in both contexts via WizardShell `variant` prop.

### Design System Integration
**Context:** data-terminal provides 24 atoms + 31 molecules with a cyberpunk/terminal aesthetic.
**Approach:** Components imported via path aliases (`@dt/atoms`, `@dt/molecules`) or barrel re-export. Console uses data-terminal as source (transpiled by Next.js), not as a published package.
**Key files:** `packages/console/src/components/data-terminal.ts` (barrel), `~/repos/data-terminal/src/`

**Card interactivity:** `Card` and `TerminalCard` accept an `interactive` prop (default `false`). When `true`, the card shows hover glow (border + shadow) and scanline overlay, signaling clickability. Informational cards (detail panels, dashboards, wizard containers) omit it. Only selectable cards (template picker, tier picker) set `interactive`. The `scanline` prop can still be overridden independently.

**Component boundary rule:** If a UI component is a generic, reusable pattern (navigation, layout, data display), it belongs in the design system as an atom or molecule — even if only the console uses it today. The console should only contain app-specific wiring (hooks that derive data from routes/state, providers, page compositions). When in doubt: if the component takes data as props and renders UI, it's a design system component. If it reads from Next.js hooks, sidebar config, or app context, it's console-specific.

Examples:
- `Breadcrumbs` (renders crumb items with links/separators) → design system molecule
- `PageHeader` (derives crumbs from `usePathname()` + sidebar config, sets `document.title`) → console shell component
- `DataTable`, `Badge`, `TerminalTabs` → design system molecules
- `ResourceFilterBar` (composes design system inputs for resource list filtering) → console component

### Wallet Connection Pattern
**Context:** Users connect wallets to sign transactions and pay for resources. Support 4 chains: ETH, AVAX, BASE, SOL.
**Approach:** Reown AppKit initialized at module scope (SSR-safe). `WalletProvider` wraps the app and exposes `WalletState` via React context. `ManagersProvider` consumes `useWallet()` internally to resolve Aleph Account, then invalidates all React Query caches when the account changes so data refetches with the authenticated managers. The managers context also exposes `accountAddress` so query hooks can gate on account availability and scope cache keys per account. Provider type guards (`isEip155Provider`, `isSolanaProvider`) distinguish EVM vs Solana wallets.
**Provider order:** `QueryProvider > WalletProvider > ManagersProvider > ThemeProvider > ToastProvider`
**Key files:** `packages/console/src/providers/wallet-provider.tsx`, `packages/console/src/providers/managers-provider.tsx`, `packages/aleph-sdk/src/types/provider.ts`

### Payment & Cost Estimation Pattern
**Context:** Resource creation wizards need to show costs and check if the user can afford them before deploying.
**Approach:** Two-layer system. SDK layer: `BalanceManager` fetches ALEPH balance from pyaleph API (all chains), `CostManager` provides pricing aggregates. React layer: `useCostEstimate` computes costs from pricing + form params, `useCanAfford` checks balance vs cost. UI layer: `CheckoutSummary` composite component composes PaymentMethodToggle + CostBreakdown + InsufficientFundsAlert. Pure computation functions exported for testing.
**Key files:** `packages/aleph-sdk/src/managers/balance.ts`, `packages/console/src/hooks/use-cost-estimate.ts`, `packages/console/src/hooks/use-can-afford.ts`, `packages/console/src/components/payment/checkout-summary.tsx`
**Data flow:** `useWizard form state -> CheckoutSummary -> useCostEstimate(form values) -> CostManager -> CostSummary` and `useCanAfford(cost, paymentMethod) -> BalanceManager -> canAfford`

### Page Header & Breadcrumb Pattern
**Context:** Pages need location context without large title blocks consuming viewport space.
**Approach:** `PageHeader` component auto-derives breadcrumb items from `usePathname()` + sidebar config, sets `document.title`, and provides an optional children slot for action buttons. Uses the design system `Breadcrumbs` molecule for rendering. Non-navigable intermediate URL segments (e.g. `infrastructure`) are skipped. Back arrow links to dashboard (hidden on dashboard itself).
**Key files:** `packages/console/src/components/shell/page-header.tsx`, `~/repos/data-terminal/src/molecules/breadcrumbs.tsx`
**Notes:** Every page uses `<PageHeader>` as its first element. List pages pass action buttons as children. Wizard and detail pages use `<PageHeader />` without children.

### Dashboard Pattern
**Context:** Dashboard needs different content for connected (wallet linked) vs disconnected users.
**Approach:** `DashboardPage` checks `useWallet().isConnected` and renders `ConnectedDashboard` or `DisconnectedDashboard`. Connected layout uses a two-column grid (`1fr 320px` on `lg+`, single column below) with a sticky sidebar. Disconnected layout shows public network stats (fetched without auth via `useNetworkStats`), feature highlight cards, and a connect wallet CTA.
**Key files:** `packages/console/src/app/(console)/dashboard/page.tsx`, `packages/console/src/components/dashboard/connected-dashboard.tsx`, `packages/console/src/components/dashboard/disconnected-dashboard.tsx`, `packages/console/src/components/dashboard/dashboard-sidebar.tsx`
**Notes:** `useNetworkStats` fetches CCN/CRN counts and aggregate compute specs from `nodeManager` — public data requiring no wallet connection. The sidebar composes `QuickActions`, `QuickLinks`, and `GettingStarted` in a sticky column.

### Resource List Pattern
**Context:** All resource list pages (compute, volumes, domains, websites, SSH keys) share the same interaction model: search, filter, sort, paginate, select, bulk actions.
**Approach:** `useResourceList<T>` generic hook manages all list state via URL search params. Each page provides `getId`, `searchFn`, `filterFn`, and `sortFn` callbacks. Pagination is fixed at 25 items. Selection state is local (not URL).
**Key files:** `packages/console/src/hooks/use-resource-list.ts`, `packages/console/src/components/resources/`
**Notes:** Shared presentational components (`ResourceFilterBar`, `ResourcePagination`, `ResourceEmptyState`, `BulkActionBar`, `DeleteConfirmationModal`) compose with the hook. Each page maps its entity data to `RowShape` objects for `DataTable`.

### Resource Detail Page Pattern
**Context:** All resource types need detail views with consistent structure: header with status/actions, tabbed content, delete confirmation.
**Approach:** Each detail page uses `use(params)` to unwrap Next.js 16 async params. Shared layout: PageHeader (breadcrumbs) → header (icon, name, StatusDot, Badge, CopyButton for ID) → `TerminalTabs` with Overview + Settings tabs. Settings tab always contains a danger zone with `DeleteConfirmationModal`. Instance detail has 4 tabs (overview, logs, networking, settings) with extracted tab components. Simpler resources inline their tab content.
**Key files:** `packages/console/src/app/(console)/compute/[id]/page.tsx`, `packages/console/src/components/compute/detail/`, `packages/console/src/app/(console)/infrastructure/*/[id]/page.tsx`
**Notes:** Volume delete uses `highRisk` prop on `DeleteConfirmationModal` for type-to-confirm. Instance actions (start/stop/reboot) use `useInstanceActions` mutation hook. The website detail page uses a two-column card grid (`grid-cols-1 lg:grid-cols-2 items-start`) — ACCESS cards (gateway, alternative, ENS) in the left column, VERSION card in the right column. This pattern should be extended to other detail pages (see BACKLOG.md).

### Aleph Volumes and IPFS Hashes
**Context:** Websites (and other resources) reference volumes by ID, and volumes contain IPFS content. There are two distinct hashes involved that are easy to confuse.
**Approach:** Understand the two-hash system:
- **Aleph message hash** (hex, 64 chars, e.g. `c23a24980ae6...`): The hash of the Aleph STORE message itself. This is what's stored as `volume_id` in website aggregates and used as `volume.id` when parsing. Used to look up the volume entity.
- **IPFS CID** (CID v0 starts with `Qm`, CID v1 starts with `bafy`): The content hash on IPFS. This lives in the volume entity's `item_hash` field (from `StoreContent`, spread via `...content` in `VolumeManager.parseMessage`). Used for IPFS gateway URLs.

**Data flow for website gateway URLs:**
1. Website aggregate stores `volume_id` (Aleph message hash)
2. Fetch the volume entity via `useVolume(website.volume_id)`
3. Read `volume.item_hash` (the IPFS CID v0)
4. Convert to CID v1 via `cidV0toV1(volume.item_hash)`
5. Construct gateway URL: `https://${cidV1}.ipfs.aleph.sh`

**Key files:** `packages/aleph-sdk/src/managers/volume.ts:297-312` (parseMessage), `packages/aleph-sdk/src/managers/website.ts:135` (volume_id assignment), `packages/aleph-sdk/src/utils.ts` (cidV0toV1)
**Notes:** Never attempt CID conversion on `website.volume_id` or `volume.id` — these are hex hashes, not CIDs. The `VolumeManager.download` method also distinguishes between the two via `volume.item_type === 'ipfs'`.

### Website Aggregate Structure
**Context:** Website data is stored as an Aleph aggregate keyed by `websites`. The aggregate item structure differs from what you might expect based on the type name.
**Approach:** The actual aggregate content (written by `WebsiteManager.addSteps`) has this shape:
```typescript
{
  metadata: { name, tags, framework },  // NOT top-level fields
  version: number,                      // starts at 1, incremented on update
  volume_id: string,                    // Aleph message hash (hex)
  volume_history?: string[],            // previous volume_ids
  ens?: string,                         // ENS domain name
  created_at: number,                   // unix timestamp
  updated_at: number,                   // unix timestamp
}
```
**Key files:** `packages/aleph-sdk/src/types/website.ts` (WebsiteAggregateItem), `packages/aleph-sdk/src/managers/website.ts` (addSteps, updateSteps, parseAggregateItem)
**Notes:** Both `addSteps` and `updateSteps` must write `name` and `framework` inside `metadata`, not at the top level. The parser reads from `metadata?.framework` and `metadata?.name` with fallback defaults.

### Tailwind CSS 4 + Turbopack
**Context:** Next.js 16 with pnpm monorepo. Tailwind CSS 4 uses `@tailwindcss/postcss` plugin.
**Approach:** `postcss` must be an explicit devDependency (pnpm doesn't hoist transitive deps). Config must be `.cjs` format (`postcss.config.cjs`). The `@source` directive in `globals.css` tells Tailwind to scan data-terminal source files for utility classes. `@dt/*` aliases are configured via `turbopack.resolveAlias` in `next.config.ts`. Node.js built-in stubs (`fs`, `net`, `tls`, `os`, `path`) point to `src/lib/empty-module.ts` (an empty ESM export). `turbopack.root` is dynamically computed as the closest common ancestor of the monorepo and data-terminal's real paths, allowing Turbopack to read files across both directories.
**Key files:** `packages/console/postcss.config.cjs`, `packages/console/src/app/globals.css`, `packages/console/next.config.ts`, `packages/console/src/lib/empty-module.ts`
**Notes:** data-terminal uses `@dt/` as its internal import prefix (not `@/`), matching the aliases the console configures. The `packages/data-terminal` symlink MUST use a relative path (`../../data-terminal`) that resolves within the real filesystem — not through intermediate symlinks (e.g. `~/repos` → Dropbox). Turbopack checks symlink targets against its filesystem root but does NOT fully resolve chained symlinks (vercel/next.js#77562). The `tailwindcss` CSS package is also aliased in `resolveAlias` because the expanded `turbopack.root` changes PostCSS module resolution context. Never add a `webpack` key to `next.config.ts` — Turbopack handles all resolution.

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
