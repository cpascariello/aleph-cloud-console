# Collapsible Right-Side Drawer Panel

## Context

Page titles were replaced with breadcrumbs, freeing vertical space. The next step is rethinking how wizards and quick actions occupy the viewport. Currently wizards are full-page routes (`/compute/new`, etc.) that take over the entire content area, losing context of the resource list. Quick actions live inline on the dashboard only.

The goal: a slide-in drawer panel from the right (~460px) that houses wizards and quick actions without navigating away from the current page. Hidden by default — main content stays full-width until triggered. The drawer overlays content (no push/reflow) with a slight backdrop dim. Future: the drawer footer slot can hold a checkout summary.

---

## Architecture Decisions

- **Drawer renders inline in ConsoleShell** (not a portal). Uses `absolute inset-0` within the right-column flex container. Backdrop covers navbar + main but NOT the sidebar — sidebar stays navigable.
- **z-index: z-[45]** — between navbar (z-40) and command palette/modals (z-50). Command palette can open on top of drawer.
- **Dim main content, don't disable it.** Backdrop click dismisses the drawer.
- **Component boundary:** Generic `Drawer` primitive in data-terminal, `TerminalDrawer` wrapper with chrome. Console provides `DrawerProvider` context + `useDrawer` hook.
- **Wizard URL strategy:** `/new` routes become redirects to parent with `?wizard=type` search param. List pages auto-open the drawer when they see the param. Deep links preserved.
- **Wizard state survives close/reopen** via existing `useWizard` localStorage persistence. No changes needed to the hook.

---

## Step 1 — Drawer primitives in data-terminal

**New:** `~/repos/data-terminal/src/molecules/drawer.tsx`

```
DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  width?: number (default 460)
  header?: ReactNode
  overlay?: ReactNode
  wrapper?: (panel: ReactNode) => ReactNode
  footer?: ReactNode    ← future checkout slot
  children: ReactNode
  className?: string
}
```

- Follows Modal pattern: `useDismiss` for Escape + backdrop click, focus trap
- Animation: `translate-x-full → translate-x-0` (300ms ease-out), backdrop `opacity-0 → opacity-100`
- Does NOT lock body scroll (unlike Modal)
- Returns null when `!open`

**New:** `~/repos/data-terminal/src/molecules/terminal-drawer.tsx`

Mirrors TerminalModal — wraps Drawer with TerminalTopBar + HoverScanline + CornerNotch + close button.

```
TerminalDrawerProps {
  open, onClose, title?, tag?, width?, footer?, children, className?
}
```

**Modify:** `~/repos/data-terminal/src/molecules/index.ts` — add exports
**Modify:** `~/repos/data-terminal/CLAUDE.md` — add to inventory
**Modify:** `~/repos/data-terminal/docs/DESIGN-SYSTEM.md` — add API reference

**Reference:** `~/repos/data-terminal/src/molecules/modal.tsx` (focus trap, dismiss, animation pattern)

---

## Step 2 — Drawer context in console

**New:** `packages/console/src/providers/drawer-provider.tsx`

```
DrawerContent { content: ReactNode, title?, tag?, footer?, onClose? }
DrawerContextValue { isOpen, openDrawer(content), closeDrawer() }
```

**New:** `packages/console/src/hooks/use-drawer.ts` — thin context hook

**Modify:** `packages/console/src/components/data-terminal.ts` — add Drawer, TerminalDrawer re-exports

**Modify:** Provider tree (check `packages/console/src/app/layout.tsx` or providers file) — wrap with DrawerProvider

**Modify:** `packages/console/src/components/shell/console-shell.tsx`
- Add `relative` to the wrapper div
- Render TerminalDrawer after `<main>`, before CommandPalette
- Read drawer state from context

**Modify:** `packages/console/src/app/(console)/layout.tsx`
- Simplify: ConsoleShell becomes the flex-1 column container directly

**Verify:** Open/close drawer with test content, confirm positioning, backdrop, dismiss, z-order with command palette.

---

## Step 3 — Adapt WizardShell for drawer

**Modify:** `packages/console/src/components/wizard/wizard-shell.tsx`

Add `variant?: 'page' | 'drawer'` prop (default `'page'`).

When `variant === 'drawer'`:
- No `max-w-3xl mx-auto` wrapper
- No TerminalCard wrapper (drawer provides the chrome)
- WizardProgress + step content render in a flex column with `p-4` padding
- WizardFooter renders in the drawer's `footer` slot (passed up via callback or render prop)

When `variant === 'page'`:
- Current behavior unchanged

Step components (TemplateStep, ConfigureStep, etc.) are unaffected.

---

## Step 4 — Extract wizard content components

Extract wizard logic from page files into reusable content components that can render in both page and drawer contexts.

**New:** `packages/console/src/components/compute/instance-wizard-content.tsx`
- Moves all wizard logic from `app/(console)/compute/new/page.tsx`
- Props: `{ onComplete?: () => void }`
- Uses `useWizard`, renders WizardShell with `variant="drawer"`

**New:** `packages/console/src/components/infrastructure/volume-wizard-content.tsx`
**New:** `packages/console/src/components/infrastructure/domain-wizard-content.tsx`
**New:** `packages/console/src/components/infrastructure/website-wizard-content.tsx`

---

## Step 5 — Wire up drawer triggers

**Modify list pages** — "Create"/"Deploy" buttons call `openDrawer()` instead of `<Link href="/new">`:

- `app/(console)/compute/page.tsx`
- `app/(console)/infrastructure/volumes/page.tsx`
- `app/(console)/infrastructure/domains/page.tsx`
- `app/(console)/infrastructure/websites/page.tsx`

Each reads `?wizard=type` from search params to auto-open on redirect.

**Modify `/new` routes** — become thin redirects:

- `app/(console)/compute/new/page.tsx` → `redirect('/compute?wizard=instance')`
- `app/(console)/infrastructure/volumes/new/page.tsx` → `redirect('/infrastructure/volumes?wizard=volume')`
- `app/(console)/infrastructure/domains/new/page.tsx` → `redirect('/infrastructure/domains?wizard=domain')`
- `app/(console)/infrastructure/websites/new/page.tsx` → `redirect('/infrastructure/websites?wizard=website')`

**Modify:** `packages/console/src/components/dashboard/quick-actions.tsx`
- Change from `<Link href="...">` to `onClick={() => openDrawer(...)}`

---

## Step 6 — Docs and cleanup

- `docs/ARCHITECTURE.md` — add Drawer Pattern section, update Wizard Pattern
- `docs/DECISIONS.md` — log the drawer decision
- `CLAUDE.md` — update Current Features
- `data-terminal/CLAUDE.md` — update inventory
- `data-terminal/docs/DESIGN-SYSTEM.md` — full Drawer + TerminalDrawer API docs
- Remove unused imports from converted page files

---

## File Summary

| Action | File |
|--------|------|
| **Create** | `data-terminal/src/molecules/drawer.tsx` |
| **Create** | `data-terminal/src/molecules/terminal-drawer.tsx` |
| **Create** | `console/src/providers/drawer-provider.tsx` |
| **Create** | `console/src/hooks/use-drawer.ts` |
| **Create** | `console/src/components/compute/instance-wizard-content.tsx` |
| **Create** | `console/src/components/infrastructure/volume-wizard-content.tsx` |
| **Create** | `console/src/components/infrastructure/domain-wizard-content.tsx` |
| **Create** | `console/src/components/infrastructure/website-wizard-content.tsx` |
| **Modify** | `data-terminal/src/molecules/index.ts` |
| **Modify** | `console/src/components/data-terminal.ts` |
| **Modify** | `console/src/components/shell/console-shell.tsx` |
| **Modify** | `console/src/app/(console)/layout.tsx` |
| **Modify** | `console/src/components/wizard/wizard-shell.tsx` |
| **Modify** | `console/src/app/(console)/compute/page.tsx` |
| **Modify** | `console/src/app/(console)/compute/new/page.tsx` |
| **Modify** | `console/src/app/(console)/infrastructure/volumes/page.tsx` |
| **Modify** | `console/src/app/(console)/infrastructure/volumes/new/page.tsx` |
| **Modify** | `console/src/app/(console)/infrastructure/domains/page.tsx` |
| **Modify** | `console/src/app/(console)/infrastructure/domains/new/page.tsx` |
| **Modify** | `console/src/app/(console)/infrastructure/websites/page.tsx` |
| **Modify** | `console/src/app/(console)/infrastructure/websites/new/page.tsx` |
| **Modify** | `console/src/components/dashboard/quick-actions.tsx` |
| **Modify** | Docs (ARCHITECTURE.md, DECISIONS.md, CLAUDE.md, DT docs) |

---

## Verification

1. `pnpm typecheck` — clean pass
2. Dev server: drawer opens from "Deploy" button on compute page, wizard steps work, close dismisses
3. URL redirect: visiting `/compute/new` redirects to `/compute?wizard=instance` and opens drawer
4. Sidebar stays interactive while drawer is open
5. Command palette (⌘K) opens on top of drawer at z-50
6. Escape closes drawer (or command palette first if both open)
7. Wizard localStorage persistence: partially fill wizard → close drawer → reopen → state restored
8. Quick actions on dashboard trigger drawer with correct wizard content
9. All 4 wizard types work: instance, volume, domain, website
