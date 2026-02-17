# Aleph Cloud Console v2 — Design Document

**Date:** 2026-02-17
**Status:** Approved
**Approach:** Terminal-First Dashboard + Wizard-Driven Creation Flows
**Design System:** data-terminal (~/repos/data-terminal)

## Overview

A full rewrite of the Aleph Cloud console using the data-terminal design system. The new console rethinks product scope: same resource types as today, plus real-time monitoring, deployment templates, and a community marketplace. The app targets a mixed audience (developers through non-technical founders) using progressive disclosure.

**Key decisions:**
- Full replacement of the existing console (no parallel operation)
- Next.js 16 App Router + React 19 + Tailwind CSS 4 (matching data-terminal stack)
- React Query for server state, React Hook Form + Zod for forms
- No Redux, no styled-components, no CSS-in-JS

---

## 1. Application Shell & Navigation

### Layout

Persistent sidebar + top navbar + content area. The sidebar uses data-terminal's `Sidebar` component (collapses to icon rail). The navbar uses `Navbar` with wallet connection, search trigger, and notifications.

```
+-------------------------------------------------------+
|  Navbar: [Logo] [Network Status] [Cmd+K] [Notif] [Wallet] |
+--------+----------------------------------------------+
|        |                                              |
| Side-  |  Content Area                                |
| bar    |  +------------------------------------------+|
|        |  |  Page Header (breadcrumbs + actions)     ||
|        |  +------------------------------------------+|
|        |  |  Page Content                            ||
|        |  +------------------------------------------+|
+--------+----------------------------------------------+
```

### Sidebar Groups

| Group | Items | Notes |
|-------|-------|-------|
| **Overview** | Dashboard, Monitoring | Fleet-wide views |
| **Compute** | Compute, SSH Keys | Compute page has tabs: Instances / GPU / Confidential / Functions |
| **Infrastructure** | Volumes, Domains, Websites | Merged storage + networking |
| **Marketplace** | Templates, Community Images | Discovery + pre-built stacks |
| **Settings** | Account, Billing | Personal settings |

9 sidebar items total. Compute types are flattened into tabs within a single Compute page.

### Command Palette (Cmd+K)

A `TerminalModal` + `CommandInput` overlay providing:
- Navigate to any page
- Create any resource
- Act on existing resources (stop, start, delete by name)
- Search across all resources by name or hash

Every action available in the UI is also available via the command palette.

### Responsive Behavior

| Breakpoint | Sidebar |
|------------|---------|
| Desktop (>=1024px) | Full expanded sidebar |
| Tablet (768-1023px) | Collapsed icon rail |
| Mobile (<768px) | Hidden, hamburger menu |

### Data-terminal Components Used

- `Sidebar` (collapsible icon rail)
- `Navbar` (with actions slot)
- `TerminalModal` + `CommandInput` (command palette)
- `GlowLine` (section dividers)
- `ToastContainer` via `useToast` (notifications)

---

## 2. Dashboard & Monitoring

### Main Dashboard (/dashboard)

Landing page after wallet connection. Serves two audiences:

**Returning users see:**
- Stat cards row: resource counts + ALEPH balance (`StatCard` with animated count-up)
- Resource health table: all compute resources with status, specs (`DataTable` + `StatusDot` + `Badge`)
- Quick actions: buttons to create resources or browse templates
- Section dividers: `GlowLine`

**New users see (first visit, no resources):**
- Getting started checklist inside a `TerminalCard`:
  1. Connect wallet (auto-checked)
  2. Add an SSH key
  3. Deploy your first instance
  4. Link a custom domain
- Quick deploy section: 3-4 popular templates (Ubuntu, Python API, static site)
- `TypewriterText` animation: "Your infrastructure starts here..."

The checklist is dismissible and state is stored in localStorage.

### Monitoring Page (/monitoring)

Fleet-wide health dashboard (new feature, not in current app):

- Status summary: count of running/booting/stopped resources (`Badge` variants)
- Resource usage: aggregate CPU, RAM, storage usage (`ProgressBar` inside `TerminalCard`)
- Activity log: recent operations as a `TerminalWindow` live feed
- Auto-refresh toggle (`Toggle`) and manual refresh (`IconButton`)

---

## 3. Resource List Views

### Shared Pattern

Every resource page follows a consistent layout:

1. **Page header:** Title + "Create" button
2. **Filter bar:** `SearchInput` (debounced) + `Select` dropdowns (status, type) + sort control
3. **Data table:** `DataTable` (sortable, monospaced) with `Checkbox` per row for bulk selection
4. **Pagination:** Client-side, 25 items per page
5. **Bulk action bar:** Sticky footer when items selected (Start / Stop / Delete)
6. **Empty state:** `TerminalCard` with `TypewriterText` + template suggestions + create button

### Improvements Over Current App

| Feature | Current | New |
|---------|---------|-----|
| Search | None | `SearchInput` with debounced filtering |
| Filters | None | `Select` dropdowns for status, type |
| Pagination | None (all rows rendered) | Client-side pagination (25/page) |
| Bulk actions | None | Checkbox selection + batch operations |
| Delete confirmation | None (instant) | `TerminalModal` with type-to-confirm for high-risk resources |
| Row actions | Dropdown menu | `IconButton` group + `Tooltip` |

### Compute Page (Tabbed View)

Uses `TerminalTabs` with 4 tabs showing resource counts in labels:

| Tab | Unique Columns |
|-----|---------------|
| Instances (N) | CPU, RAM, HDD, CRN, Payment |
| GPU (N) | GPU Model, VRAM, CRN, Payment |
| Confidential (N) | TEE Status (attestation badge) |
| Functions (N) | Runtime, Invocations, Last Called |

### Delete Confirmation

Two tiers of confirmation:

**High-risk (instances, volumes):** `TerminalModal` requiring user to type the resource name:
- Title: "Delete [resource-type]"
- Warning text explaining irreversibility
- `CommandInput` for name confirmation
- Cancel + Delete (danger variant) buttons

**Lower-risk (domains, SSH keys):** Simple confirm/cancel `TerminalModal` without type-to-confirm.

---

## 4. Creation Wizards

### Wizard Shell

All creation flows use a shared wizard container:

- **Progress indicator:** Step dots with labels + `ProgressBar`
- **Step content:** Varies per resource type
- **Footer:** Back/Next navigation + running cost estimate (updates live)
- **Draft auto-save:** Wizard state persisted to localStorage

Users can freely navigate between completed steps.

### Instance Creation (5 Steps)

**Step 1: Choose Template or Start from Scratch**
- Grid of popular template cards (`TerminalCard`): name, specs, cost, "Deploy" button
- Link to community templates
- "Start from scratch" option
- Templates pre-fill steps 2-4; user jumps to Step 5 (Review)

**Step 2: Configure Resources**
- Payment method toggle: Hold tokens vs Pay-as-you-go (`RadioGroup`)
- Tier selection cards: Starter / Standard / Pro with specs and cost
- Expandable `Accordion` for custom specs (CPU slider, RAM slider, HDD input)
- OS image selection (`Select` dropdown)
- Node selection (PAYG only): auto-select or manual via `TerminalModal`

Progressive disclosure: newcomers pick a tier, power users expand custom config.

**Step 3: Access & Security**
- SSH key selection (`Checkbox` list + "Add new" button)
- Name and tags (`CommandInput` fields)
- Terms & conditions checkbox (PAYG only)

**Step 4: Networking (Optional, Skippable)**
- Attach existing or create new volume
- Link a custom domain
- Explicit "Skip this step" button

**Step 5: Review & Deploy**
- Full summary of all configuration
- Cost breakdown (compute, storage, total, balance check)
- Edit link to go back to any step
- "Deploy Instance" button

### Deployment Progress (Post-Submit)

Full-screen `TerminalWindow` showing deployment steps in real-time:
- Checkmark for completed steps, spinner for current, empty for pending
- Step counter (e.g., "2/4")
- `ProgressBar` at bottom
- On success: link to the new resource's detail page

Replaces the current toast-based notification with an immersive experience.

### Other Resource Wizards

| Resource | Steps |
|----------|-------|
| Volume | 2: Configure (size, name) -> Review & Create |
| Domain | 2: Enter domain + select resource -> Review & Create |
| Website | 3: Template or upload -> Configure -> Review & Deploy |
| Function | 3: Template or code -> Configure (runtime, triggers) -> Review & Deploy |
| SSH Key | Modal only: Paste key or generate -> Save (no wizard) |

---

## 5. Resource Detail Views

### Shared Detail Layout

Every resource has a detail page with:
- **Header:** Name, hash (copyable via `CopyButton`), status (`StatusDot` + `Badge`), payment info, actions dropdown
- **Tabs:** `TerminalTabs` with resource-specific tabs
- **Actions:** Stop / Start / Reboot / Delete (with confirmation)

### Instance Detail Tabs

**Overview:** Specs card, uptime, cost summary, linked resources as clickable `Badge` chips (SSH keys, volumes, domains)

**Logs:** Real-time log viewer (`TerminalWindow`), log level filter (`Select`), search (`SearchInput`), auto-scroll toggle (`Toggle`), download button

**Networking:** Linked volumes and domains (with detach/unlink), port forwarding rules, "Attach Volume" / "Link Domain" buttons opening `TerminalModal`

**Settings:** SSH key management, environment variables, resize instance (triggers redeployment), danger zone (`Alert` error variant + type-to-confirm delete)

### Volume Detail (2 Tabs)

- **Overview:** Size, creation date, linked instances, cost
- **Settings:** Rename, resize, danger zone

### Domain Detail (2 Tabs)

- **Overview:** Domain name, DNS configuration instructions (`CodeBlock` with required records), linked resource, SSL status
- **Settings:** Change linked resource, danger zone

---

## 6. Marketplace & Templates

### Templates Page (/marketplace/templates)

- Search bar + category/type filters
- Featured templates section (curated grid of `TerminalCard`)
- All templates grid (filterable, paginated)
- Categories: Web Hosting, Compute, AI/ML, Databases, Dev Tools, Community

**Template card:** Name, description, included resource icons, estimated cost, popularity badge, "Deploy" button (opens wizard at Step 5 Review).

**Template data model:**
```typescript
interface Template {
  id: string
  name: string
  description: string
  category: TemplateCategory
  image: string
  specs: { cpu: number; ram: number; storage: number }
  volumes?: VolumeConfig[]
  domains?: DomainConfig[]
  tags: string[]
  popularity: number
  author: 'official' | string
}
```

### Community Images Page (/marketplace/images)

Two modes via `TerminalTabs`:

**Browse tab:** Searchable catalog of community-contributed VM images with name, author, description, size, compatibility badges, and "Use this image" button.

**Create & Publish tab:**
- Documentation card with link to docs.aleph.cloud explaining the image creation process
- Quick reference `CodeBlock` showing CLI commands
- "Publish Image" form: name, description, image hash, compatibility checkboxes

---

## 7. Wallet & Payments

### Wallet Connection

**Disconnected:** Navbar shows "Connect Wallet" button (`Button` primary). Opens `TerminalModal` with wallet options (MetaMask, WalletConnect, Phantom), chain selection, and explanation of what connecting means.

**Connected:** Navbar shows truncated address (`CopyButton`), chain icon (`Badge`), ALEPH balance. Click opens dropdown: Switch chain, Disconnect, View on explorer.

**Chain mismatch:** When an action requires a different chain, show inline `Alert` (warning) with one-click "Switch to [chain]" button.

### Payment UX

- Running cost estimate visible throughout wizards (in footer)
- Payment method comparison card: Hold vs PAYG with plain-language descriptions
- Insufficient funds: `Alert` with current balance, required amount, link to acquire ALEPH
- NFT vouchers: surfaced in cost breakdown with "Apply voucher" action

---

## 8. Error Handling

### Strategy

| Layer | Pattern | Component |
|-------|---------|-----------|
| React rendering | Error boundary at layout + page level | `Alert` (error) + retry button |
| API/network | Caught in hooks, shown as toasts | `useToast` error variant |
| Form validation | Per-field inline errors | Red border + error text below field |
| Blockchain | Caught in async generators | `TerminalModal` with error details + retry |
| Wallet | Chain mismatch, signature rejected | `Alert` (warning) + action button |

### Error Boundary UI

Wraps every page route. Shows:
- Error message in `CodeBlock`
- Retry button
- "Go to Dashboard" fallback navigation
- "Report Issue" link

---

## 9. Accessibility

Data-terminal provides strong foundations. The console adds:

- **Keyboard:** All actions reachable via keyboard. Command palette (Cmd+K) is primary keyboard navigation.
- **Screen readers:** All status indicators have text equivalents. Tables use `aria-sort`.
- **Reduced motion:** All terminal effects respect `prefers-reduced-motion` (handled by data-terminal CSS).
- **High contrast:** The `contrast` theme (WCAG AAA) is available.
- **Focus indicators:** Visible focus rings via `--ring` token.

---

## 10. State Management

### Architecture

- **Server state:** React Query (TanStack Query) for all API/blockchain data
- **UI state:** URL params for filters/sort/pagination + React local state for ephemeral UI
- **Wallet state:** Reown SDK context
- **Form state:** React Hook Form + Zod

### Why React Query Over Redux

The console is a data dashboard — almost all state comes from the Aleph network. React Query handles caching, background refetching, cache invalidation, optimistic updates, and loading/error states out of the box. The current app builds all of this manually.

Cascade invalidation (e.g., SSH key deleted -> refresh instances) is a single `invalidateQueries` call vs custom store logic.

### Real-time Updates

- Polling via React Query `refetchInterval` (5s for running resources, 30s for idle)
- Optimistic updates for actions (stop/start/reboot update UI immediately, rollback on failure)
- Boost polling after actions (temporarily increase poll frequency)

---

## 11. Tech Stack Summary

| Concern | Technology |
|---------|------------|
| Framework | Next.js 16 (App Router) |
| React | 19 |
| Styling | Tailwind CSS 4 + data-terminal design system |
| State (server) | TanStack React Query |
| State (forms) | React Hook Form + Zod |
| State (wallet) | Reown SDK |
| Icons | Lucide React (via data-terminal) |
| Syntax highlighting | Shiki (via data-terminal CodeBlock) |
| Linting | oxlint |
| Formatting | oxfmt |
| Testing | Vitest |
| Type checking | TypeScript 5.9 strict mode |

---

## 12. Domain Logic Extraction

The current app's domain layer (EntityManager pattern, async generators) is well-structured. The new console reuses this logic by extracting it into a standalone SDK package:

```
packages/
  aleph-sdk/          # Domain logic, entity managers, API clients
    src/
      managers/       # InstanceManager, VolumeManager, etc.
      types/          # Entity types, step types
      api/            # Network API clients
  console/            # Next.js app (the new console)
    src/
      app/            # App Router pages
      components/     # UI components
      hooks/          # React hooks wrapping SDK
```

This separation means:
- Domain logic is testable independently of React
- Future CLI tools or other UIs can reuse the SDK
- The console is purely a UI layer over the SDK

---

## 13. Page Inventory

| Route | Page | Components |
|-------|------|------------|
| `/` | Redirect to /dashboard | — |
| `/dashboard` | Main dashboard | StatCard, DataTable, TerminalCard, Button |
| `/monitoring` | Fleet monitoring | ProgressBar, TerminalWindow, Badge, Toggle |
| `/compute` | Compute list (tabbed) | TerminalTabs, DataTable, SearchInput, Select |
| `/compute/new` | Instance creation wizard | Wizard shell, TerminalCard, Accordion, CommandInput |
| `/compute/[id]` | Instance detail | TerminalTabs, TerminalWindow, Badge, Alert |
| `/compute/ssh-keys` | SSH key list | DataTable, Modal |
| `/infrastructure/volumes` | Volume list | DataTable, SearchInput |
| `/infrastructure/volumes/new` | Volume creation wizard | Wizard shell (2 steps) |
| `/infrastructure/volumes/[id]` | Volume detail | TerminalTabs, TerminalCard |
| `/infrastructure/domains` | Domain list | DataTable, SearchInput |
| `/infrastructure/domains/new` | Domain creation wizard | Wizard shell (2 steps) |
| `/infrastructure/domains/[id]` | Domain detail | TerminalTabs, CodeBlock |
| `/infrastructure/websites` | Website list | DataTable, SearchInput |
| `/infrastructure/websites/new` | Website creation wizard | Wizard shell (3 steps) |
| `/infrastructure/websites/[id]` | Website detail | TerminalTabs |
| `/marketplace/templates` | Template catalog | TerminalCard grid, SearchInput, Select |
| `/marketplace/images` | Community images | TerminalTabs (Browse / Create & Publish) |
| `/settings/account` | Account settings | CommandInput, Toggle |
| `/settings/billing` | Billing & payment | DataTable, StatCard |

**Total: 20 routes**

---

## 14. Data-terminal Component Usage Map

Summary of which data-terminal components are used where:

### High-usage (used across many pages)
- `Button`, `IconButton` — every page
- `Badge`, `StatusDot` — all resource lists and details
- `DataTable` — all list views
- `TerminalTabs` — compute list, all detail views, marketplace
- `TerminalCard` — dashboard, empty states, templates
- `SearchInput` — all list views, logs
- `Select` — filters, forms
- `CommandInput` — wizard forms, command palette
- `TerminalModal` — delete confirmations, wizard sub-flows
- `Alert` — error states, warnings, chain mismatch
- `Heading`, `Text`, `Caption` — every page
- `GlowLine` — section dividers

### Medium-usage (several pages)
- `StatCard` — dashboard, monitoring, billing
- `ProgressBar` — monitoring, deployment progress, wizards
- `Checkbox` — table selection, wizard forms
- `Toggle` — settings, log auto-scroll
- `Accordion` — wizard advanced config
- `Tooltip` — row actions, disabled states
- `CodeBlock` — domain DNS instructions, marketplace CLI reference
- `Skeleton` — loading states throughout
- `CopyButton` — resource hashes

### Low-usage (specific features)
- `TerminalWindow` — logs tab, deployment progress, monitoring activity
- `RadioGroup` — payment method selection
- `MultiSelect` — tag filtering
- `Textarea` — SSH key paste
- `TypewriterText` — new user onboarding
- `DataStream` — decorative backgrounds (dashboard, 404 page)
- `GlitchText` — 404 page, error boundary
- `ProcessCard` — monitoring page
- `Sidebar` — app shell (single instance)
- `Navbar` — app shell (single instance)
