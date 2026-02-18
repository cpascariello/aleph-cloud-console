# Working Habits

Persistent habits for maintaining project memory across sessions.

---

## Quick Start

**Sync up:** Say "sync up" or "catch me up" to restore context at session start.

---

## Three Habits

### 1. Decision Logging

Log decisions to `docs/DECISIONS.md` when these phrases appear:
- "decided" / "let's go with" / "rejected"
- "choosing X because" / "not doing X because"
- "actually, let's" / "changed my mind"

Before proposing anything, check if it contradicts a past decision. If conflict found:
> This would contradict Decision #N (summary). Override?

**Format:**
```
## Decision #[N] - [Date]
**Context:** [What we were working on]
**Decision:** [What was decided]
**Rationale:** [Why - this is the important part]
**Alternatives considered:** [If any were discussed]
```

### 2. Scope Drift Detection

**This is an active interrupt, not a passive log.**

When the conversation drifts from the stated task:
1. Stop and say: "This is drifting from [original task]. Add to backlog and refocus, or pivot?"
2. If backlog: log to `docs/BACKLOG.md` and return to the original task
3. If pivot: continue, but note the scope change

**Triggers to watch for:**
- "Would it be useful to add X?" (when X wasn't part of original request)
- "We could also do Y" (when Y is unrelated to core ask)
- "While we're at it, let's add Z"
- Any work that extends beyond what was asked

**Do NOT flag** clarifying questions about the core feature or technical approaches to achieve the original goal.

**Backlog format:**
```
### [Date] - [Short title]
**Source:** Identified while working on [context]
**Description:** [What needs to be done]
**Priority:** Low/Medium/High
```

### 3. Git Discipline

**Branching:**
- Brainstorm and plan on main
- When dev starts, create feature branch from main before any file edits
- Branch naming: `feature/[plan-name]`

**Before merging:** Update ALL docs before squash merging to main.
- `docs/ARCHITECTURE.md` -- add/update patterns for any new architectural decisions, new files, or changed structure
- `CLAUDE.md` -- update the Current Features list if user-facing behavior changed
- `docs/DECISIONS.md` -- log any key decisions made during the feature
- `docs/BACKLOG.md` -- move completed items to Completed section, add any deferred ideas

**Checklist before merge:**
1. ARCHITECTURE.md updated?
2. CLAUDE.md features updated?
3. DECISIONS.md has implementation decisions?
4. BACKLOG.md item moved to Completed?

**During development:** Track intent, not metrics.

- **Scope drift:** "This started as [X] but now includes [Y]. Commit [X] first?"
- **Feature complete:** When user says "done" or "that's it" -> squash merge to main
- **Pre-break:** When user says "break", "later", "tomorrow" -> "Push before you go?"

**Completion:** Squash merge keeps main history clean (one commit per feature).

Never interrupt based on file count or commit count.

---

## Context Recovery

On "sync up" or "catch me up":

1. Read `docs/DECISIONS.md`, `docs/BACKLOG.md`, `docs/ARCHITECTURE.md`
2. Check git status (branch, uncommitted changes, unpushed commits)
3. Check recent git log for context
4. Summarize:
   - Last decision logged
   - Open backlog items
   - Any blockers
   - Git status
5. State readiness

---

## Docs

| File | Purpose |
|------|---------|
| `docs/DECISIONS.md` | Decision log with rationale |
| `docs/BACKLOG.md` | Parking lot for scope creep and deferred ideas |
| `docs/ARCHITECTURE.md` | Technical patterns, component structure, and recipes |
| `docs/plans/` | Design and implementation plans (read-only reference) |

---

## Skill Integration

Skills (superpowers) are tools, not separate processes. Use them naturally:

- **Brainstorming:** Use for non-trivial design work. Flag scope creep during brainstorming.
- **Planning:** Use `writing-plans` or `EnterPlanMode` for multi-file changes, new features, unclear requirements.
- **Implementation:** Use `subagent-driven-development` or `executing-plans` for complex implementations.
- **Debugging state/sync bugs:** Before writing any fix, trace the full data flow (write -> store -> fetch -> parse -> render). Identify all integration points that need coordinated changes. Don't patch one step without understanding the chain.
- **Post-implementation:** Run build/lint verification, handle git workflow, update ARCHITECTURE.md and DECISIONS.md if new patterns or decisions emerged.

---

## Project: Aleph Cloud Console v2

Full rewrite of the Aleph Cloud console using the data-terminal design system. Deploys and manages compute resources on the Aleph decentralized network.

### Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5.9 (strict mode)
- **Styling:** Tailwind CSS 4 + data-terminal design system (`~/repos/data-terminal`)
- **State (server):** TanStack React Query
- **State (forms):** React Hook Form + Zod
- **State (wallet):** Reown SDK
- **Icons:** Lucide React
- **Testing:** Vitest
- **Linting:** oxlint
- **Formatting:** oxfmt

### Commands

```bash
pnpm dev              # Dev server (console on port 3000)
pnpm build            # Build SDK + console
pnpm typecheck        # Type check all packages
pnpm lint             # Lint all packages
pnpm test             # Run all tests
pnpm --filter console dev   # Dev server only
pnpm --filter aleph-sdk test  # SDK tests only
```

### Key Directories

```
packages/
  aleph-sdk/            # Domain logic (entity managers, types, Zod schemas)
    src/
      managers/         # InstanceManager, VolumeManager, etc.
      types/            # Entity types, enums, cost types
      schemas/          # Zod validation schemas
      constants.ts      # API URLs, channels, addresses
  console/              # Next.js app
    src/
      app/              # App Router pages
        (console)/      # Console layout group (sidebar + navbar)
          dashboard/
          compute/
          infrastructure/
          marketplace/
          settings/
      components/
        shell/          # Sidebar, navbar, command palette, error boundary
        dashboard/      # Dashboard-specific components
        compute/        # Compute list, wizard, detail components
        resources/      # Shared resource list components
        payment/        # Payment method, cost breakdown
        wallet/         # Wallet connection UI
        marketplace/    # Template cards, image browser
        wizard/         # Shared wizard shell
        data-terminal.ts  # Barrel re-export of design system
      hooks/
        queries/        # React Query hooks per entity
        mutations/      # Mutation hooks (create, delete, actions)
        use-managers.ts
        use-wallet.ts
        use-command-palette.ts
      providers/        # Theme, Toast, React Query, Managers, Wallet
      lib/              # Utilities (cn, formatting)
```

### Component Boundary Rule

Generic, reusable UI components (navigation, layout, data display) belong in the design system (`~/repos/data-terminal/`) as atoms or molecules. The console only contains app-specific wiring — hooks that derive data from routes/state, providers, and page compositions. See Decision #10 and ARCHITECTURE.md "Design System Integration" for details.

### Reference Codebases

- **Current console (domain logic source):** `~/repos/front-aleph-cloud-page/`
- **Design system:** `~/repos/data-terminal/`

### Current Features

<!-- Update this list as features are added -->
- App shell: sidebar, navbar, breadcrumb page header, command palette, error boundary, theme/toast providers
- SDK: entity managers, types, Zod schemas, React Query hooks, mutation hooks
- Dashboard: stat cards (6 entity counts), resource health table, quick actions, getting started checklist
- Compute page: tabbed list (Instances, GPU, Confidential, Functions) with search, sort, pagination, delete
- Infrastructure pages: Volumes (type filter), Domains, Websites (framework filter) — all with search, pagination, delete
- SSH Keys page: list with add key modal and inline delete
- Shared resource components: filter bar, pagination, empty state, bulk action bar, delete confirmation modal
- Wizard shell: useWizard hook with step state, validation, localStorage auto-save, progress bar, back/next footer
- Instance creation wizard: 5 steps (template, configure, access, networking, review) + deploy progress terminal
- Volume creation wizard (2 steps), Domain creation wizard (2 steps), Website creation wizard (3 steps)
- Instance detail page: 4-tab layout (overview specs, logs terminal, networking/volumes, settings/danger zone) with start/stop/reboot/delete actions
- Volume detail page: size, dates, delete with high-risk confirmation
- Domain detail page: DNS configuration code block, linked resource info, delete
- Website detail page: framework display, endpoint URL, delete
- Wallet connection: Reown AppKit integration, multi-chain support (ETH, AVAX, BASE, SOL), navbar wallet button with chain badge, provider type guards
- Payment components: payment method toggle (Hold/Stream), cost breakdown with line items, insufficient funds alert, checkout summary composite for wizard footers
- Payment hooks: usePricing (cached pricing aggregate), useCostEstimate (reactive cost computation), useCanAfford (balance check with React Query)
- SDK additions: BalanceManager (pyaleph API balance fetching), provider type guards (isEip155Provider, isSolanaProvider)
