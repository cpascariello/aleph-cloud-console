# Instance Status Badge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `instance.confirmed` boolean badges with real CRN execution state across list and detail pages, with alert banners for non-running states.

**Architecture:** Pure `deriveInstanceStatus()` function maps CRN data to simplified badge + optional alert. Detail page uses existing `useExecutableStatus` hook; list page uses new `useInstanceStatuses` batch hook via `useQueries`. Alert banner renders between header and tabs on detail pages — established as a cross-cutting pattern for all resource detail pages.

**Tech Stack:** TanStack React Query (`useQueries`), existing `ExecutableStatus` type, existing `Alert` component from data-terminal.

---

### Task 1: Pure status derivation function + tests

**Files:**
- Create: `packages/console/src/lib/instance-status.ts`
- Create: `packages/console/src/lib/instance-status.test.ts`

**Step 1: Write the failing tests**

```typescript
// packages/console/src/lib/instance-status.test.ts
import { describe, it, expect } from 'vitest'
import { deriveInstanceStatus } from '@/lib/instance-status'
import type { ExecutableStatus } from 'aleph-sdk'

function makeStatus(
  overrides: Partial<NonNullable<ExecutableStatus['status']>> = {},
  version: 'v1' | 'v2' = 'v2',
): ExecutableStatus {
  return {
    version,
    hash: 'abc123',
    ipv4: '1.2.3.4',
    ipv6: '::1',
    ipv6Parsed: '::1',
    node: {} as ExecutableStatus['node'],
    status: {
      running: false,
      ...overrides,
    },
  }
}

describe('deriveInstanceStatus', () => {
  it('returns "Running" when startedAt is set and running is true', () => {
    const status = makeStatus({
      running: true,
      startedAt: '2026-02-19T14:32:00Z',
    })
    const result = deriveInstanceStatus(status, false, true)
    expect(result.label).toBe('Running')
    expect(result.dotVariant).toBe('success')
    expect(result.alert).toBeUndefined()
  })

  it('returns "Booting" when preparingAt is set but not started', () => {
    const status = makeStatus({
      running: false,
      preparingAt: '2026-02-19T14:32:00Z',
    })
    const result = deriveInstanceStatus(status, false, true)
    expect(result.label).toBe('Booting')
    expect(result.dotVariant).toBe('warning')
    expect(result.alert?.variant).toBe('warning')
  })

  it('returns "Booting" when startingAt is set but not started', () => {
    const status = makeStatus({
      running: false,
      startingAt: '2026-02-19T14:32:00Z',
    })
    const result = deriveInstanceStatus(status, false, true)
    expect(result.label).toBe('Booting')
    expect(result.dotVariant).toBe('warning')
  })

  it('returns "Stopped" when stoppedAt is set', () => {
    const status = makeStatus({
      running: false,
      stoppedAt: '2026-02-19T14:32:00Z',
    })
    const result = deriveInstanceStatus(status, false, true)
    expect(result.label).toBe('Stopped')
    expect(result.dotVariant).toBe('error')
    expect(result.alert?.variant).toBe('error')
  })

  it('returns "Stopped" when stoppingAt is set', () => {
    const status = makeStatus({
      running: false,
      stoppingAt: '2026-02-19T14:32:00Z',
    })
    const result = deriveInstanceStatus(status, false, true)
    expect(result.label).toBe('Stopped')
    expect(result.dotVariant).toBe('error')
  })

  it('returns "Not Allocated" when status is null and no error', () => {
    const result = deriveInstanceStatus(null, false, true)
    expect(result.label).toBe('Not Allocated')
    expect(result.dotVariant).toBe('neutral')
    expect(result.alert?.variant).toBe('error')
  })

  it('returns "Unknown" when isError is true (CRN unreachable)', () => {
    const result = deriveInstanceStatus(null, true, true)
    expect(result.label).toBe('Unknown')
    expect(result.dotVariant).toBe('warning')
    expect(result.alert?.variant).toBe('warning')
  })

  it('falls back to confirmed-based display when not yet fetched', () => {
    const result = deriveInstanceStatus(undefined, false, true)
    expect(result.label).toBe('Running')
    expect(result.dotVariant).toBe('success')
    expect(result.alert).toBeUndefined()
  })

  it('falls back to "Pending" when not fetched and not confirmed', () => {
    const result = deriveInstanceStatus(undefined, false, false)
    expect(result.label).toBe('Pending')
    expect(result.dotVariant).toBe('warning')
    expect(result.alert).toBeUndefined()
  })

  it('returns "Running" for v1 status (no lifecycle timestamps)', () => {
    const status = makeStatus({}, 'v1')
    // v1 has no status timestamps — if CRN responded, it's running
    const result = deriveInstanceStatus(status, false, true)
    expect(result.label).toBe('Running')
    expect(result.dotVariant).toBe('success')
  })

  it('includes timestamp in booting alert message when available', () => {
    const status = makeStatus({
      running: false,
      preparingAt: '2026-02-19T14:32:00Z',
    })
    const result = deriveInstanceStatus(status, false, true)
    expect(result.alert?.message).toContain('booting')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter console test -- src/lib/instance-status.test.ts`
Expected: FAIL — module `@/lib/instance-status` does not exist

**Step 3: Write the implementation**

```typescript
// packages/console/src/lib/instance-status.ts
import type { ExecutableStatus } from 'aleph-sdk'

export type DerivedInstanceStatus = {
  label: string
  dotVariant: 'success' | 'warning' | 'error' | 'neutral'
  alert?: {
    variant: 'warning' | 'error'
    message: string
  }
}

/**
 * Derive a simplified status from CRN executable status.
 *
 * @param executableStatus - CRN status: object if fetched, null if
 *   not allocated, undefined if not yet fetched (loading/fallback).
 * @param isError - true when the CRN status fetch failed (unreachable).
 * @param confirmed - on-chain confirmation flag from the Instance entity,
 *   used as fallback while CRN status is loading.
 */
export function deriveInstanceStatus(
  executableStatus: ExecutableStatus | null | undefined,
  isError: boolean,
  confirmed: boolean,
): DerivedInstanceStatus {
  // CRN unreachable
  if (isError) {
    return {
      label: 'Unknown',
      dotVariant: 'warning',
      alert: {
        variant: 'warning',
        message:
          'Unable to reach the compute node. The displayed status may be outdated.',
      },
    }
  }

  // Not yet fetched — fall back to on-chain confirmation
  if (executableStatus === undefined) {
    return confirmed
      ? { label: 'Running', dotVariant: 'success' }
      : { label: 'Pending', dotVariant: 'warning' }
  }

  // No CRN allocated
  if (executableStatus === null) {
    return {
      label: 'Not Allocated',
      dotVariant: 'neutral',
      alert: {
        variant: 'error',
        message:
          'This instance is not allocated to any compute node.',
      },
    }
  }

  // v1 nodes don't report lifecycle — if they responded, it's running
  if (executableStatus.version === 'v1') {
    return { label: 'Running', dotVariant: 'success' }
  }

  const s = executableStatus.status

  // Running
  if (s?.running || s?.startedAt) {
    return { label: 'Running', dotVariant: 'success' }
  }

  // Stopped / Stopping
  if (s?.stoppedAt || s?.stoppingAt) {
    return {
      label: 'Stopped',
      dotVariant: 'error',
      alert: {
        variant: 'error',
        message:
          'This instance has stopped. The compute node reports it is no longer running.',
      },
    }
  }

  // Booting (preparing or starting)
  if (s?.preparingAt || s?.startingAt) {
    return {
      label: 'Booting',
      dotVariant: 'warning',
      alert: {
        variant: 'warning',
        message: 'This instance is booting up on the compute node.',
      },
    }
  }

  // Fallback: CRN responded but no recognizable lifecycle state
  return { label: 'Running', dotVariant: 'success' }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter console test -- src/lib/instance-status.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add packages/console/src/lib/instance-status.ts packages/console/src/lib/instance-status.test.ts
git commit -m "feat: add deriveInstanceStatus pure function with tests"
```

---

### Task 2: Batch status hook for list page

**Files:**
- Create: `packages/console/src/hooks/queries/use-instance-statuses.ts`

**Step 1: Write the hook**

```typescript
// packages/console/src/hooks/queries/use-instance-statuses.ts
import { useQueries } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import { executableStatusKeys } from '@/hooks/queries/use-executable-status'
import type { ExecutableStatus, Instance } from 'aleph-sdk'

type InstanceStatusEntry = {
  data: ExecutableStatus | null | undefined
  isError: boolean
}

/**
 * Batch CRN status checks for a list of instances.
 * Returns a Map keyed by instance ID.
 */
export function useInstanceStatuses(
  instances: Instance[],
): Map<string, InstanceStatusEntry> {
  const { instanceManager } = useManagers()

  const results = useQueries({
    queries: instances.map((instance) => ({
      queryKey: executableStatusKeys.detail(instance.id),
      queryFn: async (): Promise<ExecutableStatus | null> =>
        (await instanceManager.checkStatus(instance)) ?? null,
      refetchInterval: 60_000,
      retry: 1,
      staleTime: 30_000,
    })),
  })

  const map = new Map<string, InstanceStatusEntry>()
  for (let i = 0; i < instances.length; i++) {
    const instance = instances[i]
    const result = results[i]
    if (instance && result) {
      map.set(instance.id, {
        data: result.data,
        isError: result.isError,
      })
    }
  }

  return map
}
```

**Step 2: Run typecheck**

Run: `pnpm --filter console exec tsc --noEmit 2>&1 | head -30`
Expected: No new errors (pre-existing button.tsx errors are known)

**Step 3: Commit**

```bash
git add packages/console/src/hooks/queries/use-instance-statuses.ts
git commit -m "feat: add useInstanceStatuses batch hook for list page"
```

---

### Task 3: Update instance detail page with CRN status + alert banner

**Files:**
- Modify: `packages/console/src/app/(console)/compute/[id]/page.tsx`

**Step 1: Add imports and hook call**

Add imports at the top:
```typescript
import { Alert } from '@/components/data-terminal'  // add to existing import
import { useExecutableStatus } from '@/hooks/queries/use-executable-status'
import { deriveInstanceStatus } from '@/lib/instance-status'
```

After the existing hooks (after `const [showDelete, setShowDelete] = useState(false)`), add:
```typescript
const {
  data: rawExecStatus,
  isError: execStatusError,
} = useExecutableStatus(instance)
const executableStatus = rawExecStatus === undefined
  ? undefined  // loading
  : rawExecStatus  // null (not allocated) or ExecutableStatus
const instanceStatus = instance
  ? deriveInstanceStatus(executableStatus, execStatusError, !!instance.confirmed)
  : undefined
```

**Step 2: Replace header status badge**

Replace the header `StatusDot` + `Badge` block (lines 79-86):

```diff
-              <StatusDot
-                variant={instance.confirmed ? 'success' : 'warning'}
-              />
-              <Badge
-                variant={instance.confirmed ? 'success' : 'warning'}
-              >
-                {instance.confirmed ? 'Running' : 'Pending'}
-              </Badge>
+              <StatusDot
+                variant={instanceStatus?.dotVariant ?? 'neutral'}
+              />
+              <Badge
+                variant={instanceStatus?.dotVariant ?? 'neutral'}
+              >
+                {instanceStatus?.label ?? '...'}
+              </Badge>
```

**Step 3: Add alert banner between header and tabs**

After the header `</div>` (line 97) and before `<TerminalTabs` (line 100), add:

```typescript
          {instanceStatus?.alert && (
            <Alert variant={instanceStatus.alert.variant}>
              {instanceStatus.alert.message}
            </Alert>
          )}
```

**Step 4: Update sidebar summary status**

Replace the sidebar status display (lines 138-146):

```diff
-                  <StatusDot
-                    variant={
-                      instance.confirmed ? 'success' : 'warning'
-                    }
-                  />
-                  <span>
-                    {instance.confirmed ? 'Running' : 'Pending'}
-                  </span>
+                  <StatusDot
+                    variant={instanceStatus?.dotVariant ?? 'neutral'}
+                  />
+                  <span>
+                    {instanceStatus?.label ?? '...'}
+                  </span>
```

**Step 5: Run dev server and verify**

Run: `pnpm --filter console dev`
Verify: Navigate to an instance detail page. Badge should show real CRN state. Non-running states should show an alert banner between header and tabs.

**Step 6: Commit**

```bash
git add packages/console/src/app/'(console)'/compute/'[id]'/page.tsx
git commit -m "feat: instance detail badge from CRN status with alert banner"
```

---

### Task 4: Update instance list page with CRN status

**Files:**
- Modify: `packages/console/src/components/compute/instances-tab.tsx`

**Step 1: Add imports and hook call**

Add imports:
```typescript
import { useInstanceStatuses } from '@/hooks/queries/use-instance-statuses'
import { deriveInstanceStatus } from '@/lib/instance-status'
```

After `const list = useResourceList(...)`, add:
```typescript
const statusMap = useInstanceStatuses(instances)
```

**Step 2: Replace row status rendering**

In the `rows` map (lines 78-84), replace the status cell:

```diff
-    status: (
-      <span className="flex items-center gap-2">
-        <StatusDot variant={inst.confirmed ? 'success' : 'warning'} />
-        <span className="text-sm">
-          {inst.confirmed ? 'Running' : 'Pending'}
-        </span>
-      </span>
-    ),
+    status: (() => {
+      const entry = statusMap.get(inst.id)
+      const derived = deriveInstanceStatus(
+        entry?.data,
+        entry?.isError ?? false,
+        !!inst.confirmed,
+      )
+      return (
+        <span className="flex items-center gap-2">
+          <StatusDot variant={derived.dotVariant} />
+          <span className="text-sm">{derived.label}</span>
+        </span>
+      )
+    })(),
```

**Step 3: Run dev server and verify**

Run: `pnpm --filter console dev`
Verify: Instance list shows real CRN status per row. Initially shows fallback (confirmed-based), then updates as CRN responses arrive.

**Step 4: Commit**

```bash
git add packages/console/src/components/compute/instances-tab.tsx
git commit -m "feat: instance list badges from CRN status via batch polling"
```

---

### Task 5: Remove redundant inline errors from connection methods

**Files:**
- Modify: `packages/console/src/components/compute/detail/connection-methods.tsx`

The alert banner now covers "CRN unreachable" and "not allocated" at page level. The connection methods card should return `null` for these states instead of rendering its own inline messages.

**Step 1: Replace isError and !status branches with null**

Replace lines 46-71:

```diff
   if (isError) {
-    return (
-      <TerminalCard tag="CONN" label="Connection Methods">
-        <div className="flex items-center gap-2 p-4 text-sm text-warning">
-          <AlertTriangle size={16} />
-          <span>
-            Unable to reach compute node. The instance may still be
-            running.
-          </span>
-        </div>
-      </TerminalCard>
-    )
+    return null
   }

   if (!status) {
-    return (
-      <TerminalCard tag="CONN" label="Connection Methods">
-        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
-          <CircleOff size={16} />
-          <span>
-            No compute node allocated. Connection details unavailable.
-          </span>
-        </div>
-      </TerminalCard>
-    )
+    return null
   }
```

Remove unused imports: `AlertTriangle`, `CircleOff`.

**Step 2: Run typecheck**

Run: `pnpm --filter console exec tsc --noEmit 2>&1 | head -30`
Expected: No new errors

**Step 3: Commit**

```bash
git add packages/console/src/components/compute/detail/connection-methods.tsx
git commit -m "refactor: remove connection methods inline errors (covered by page alert)"
```

---

### Task 6: Migrate website "volume missing" alert to page-level position

**Files:**
- Modify: `packages/console/src/app/(console)/infrastructure/websites/[id]/page.tsx`

**Step 1: Add alert between header and tabs**

After the header `</div>` (line 124) and before `<TerminalTabs` (line 127), add:

```typescript
          {volumeError && (
            <Alert variant="warning">
              The volume backing this website has been forgotten or deleted
              from the network. The website content is no longer available.
            </Alert>
          )}
```

**Step 2: Remove alert from inside Current Version card**

Replace lines 218-225 (the Alert inside the card) — keep the Volume ID display but remove the `<Alert>`:

```diff
                            {volumeError ? (
                              <>
-                                <Alert variant="warning">
-                                  The volume backing this website has
-                                  been forgotten or deleted from the
-                                  network. The website content is no
-                                  longer available.
-                                </Alert>
                                <div className="flex items-center gap-3 text-sm">
                                  <HudLabel>Volume ID</HudLabel>
```

**Step 3: Run dev server and verify**

Run: `pnpm --filter console dev`
Verify: Website detail page with a missing volume shows the alert between header and tabs, not buried inside the version card.

**Step 4: Commit**

```bash
git add packages/console/src/app/'(console)'/infrastructure/websites/'[id]'/page.tsx
git commit -m "refactor: move website volume-missing alert to page-level position"
```

---

### Task 7: Update documentation

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/BACKLOG.md`

**Step 1: Add Detail Page Alert Pattern to ARCHITECTURE.md**

Add after the "Connection Methods & CRN Status Pattern" section:

```markdown
### Detail Page Alert Pattern
**Context:** Resource detail pages need to surface status conditions (errors, warnings, transitional states) prominently without cluttering tab content.
**Approach:** Alert banners render between the header (title + ID row) and TerminalTabs, inside the main content column. They only appear when there's something to communicate — no alert when healthy. Use `warning` variant for transitional/uncertain states (booting, CRN unreachable), `error` for problem states (stopped, not allocated, missing dependency). Applies to all resource detail pages.
**Key files:** Instance detail (`compute/[id]/page.tsx`), website detail (`infrastructure/websites/[id]/page.tsx`)
**Notes:** Tab-level components (e.g., connection methods) should return `null` for conditions already covered by the page-level alert, avoiding redundant messaging.
```

Update the "Connection Methods & CRN Status Pattern" notes to mention the page-level alert:

Add to Notes: "The page-level alert banner (Detail Page Alert Pattern) now handles 'not allocated' and 'CRN unreachable' messaging. The ConnectionMethods component returns `null` for these states."

**Step 2: Add Instance Status derivation to ARCHITECTURE.md**

Add a section or update the existing "Connection Methods & CRN Status Pattern":

```markdown
### Instance Status Derivation
**Context:** Instance status badges need real CRN execution state, not just on-chain confirmation.
**Approach:** Pure function `deriveInstanceStatus(executableStatus, isError, confirmed)` in `lib/instance-status.ts` maps CRN data to a simplified `{ label, dotVariant, alert? }` object. Three badge states: Running (success), Booting (warning, covers preparing+starting), Stopped (error, covers stopping+stopped). Two additional states: Not Allocated (neutral), Unknown (warning, CRN unreachable). Falls back to `confirmed`-based display while loading. Used by both detail page (via `useExecutableStatus`) and list page (via `useInstanceStatuses` batch hook with 60s polling).
**Key files:** `packages/console/src/lib/instance-status.ts`, `packages/console/src/hooks/queries/use-instance-statuses.ts`
```

**Step 3: Log decisions in DECISIONS.md**

```markdown
## Decision #18 - 2026-02-19
**Context:** Instance status badges showed on-chain confirmation state, not real CRN execution state. Needed to show real status on both list and detail pages.
**Decision:** Three simplified badge states (Running, Booting, Stopped) plus Not Allocated and Unknown. Alert banner between header and tabs for non-running states on detail pages. Per-instance CRN polling on list page (60s interval). Established Detail Page Alert Pattern as cross-cutting pattern for all resource detail pages.
**Rationale:** Full lifecycle granularity (7 states) is too noisy for badges. Simplified states are scannable; alert banner provides detail when something needs attention. Per-instance polling is feasible for ≤20 instances. Alert pattern between header and tabs is visible regardless of active tab, only renders when needed, and uses existing Alert component.
**Alternatives considered:** Full granularity badges (rejected: too many states, hard to scan). Status in overview card (rejected: hidden in tab content). Batch status API (rejected: doesn't exist on Aleph network).
```

**Step 4: Move backlog item to completed in BACKLOG.md**

Move "Instance status badge should reflect CRN execution state" from Open Items to Completed:

```markdown
### 2026-02-19 - Instance status badge should reflect CRN execution state
**Completed:** 2026-02-19
**Delivered:** Badges now show real CRN execution state (Running/Booting/Stopped/Not Allocated/Unknown) on both list and detail pages. Detail page shows alert banner between header and tabs for non-running states. List page polls CRN status per-instance every 60s via useInstanceStatuses batch hook. Established Detail Page Alert Pattern for all resource detail pages. Migrated website volume-missing alert to same position.
```

**Step 5: Commit**

```bash
git add docs/ARCHITECTURE.md docs/DECISIONS.md docs/BACKLOG.md
git commit -m "docs: instance status badge pattern and detail page alert documentation"
```

---

### Task 8: Final verification

**Step 1: Run all checks**

```bash
pnpm --filter console test
pnpm --filter console exec tsc --noEmit
pnpm lint
```

**Step 2: Fix any issues found**

**Step 3: Squash merge to main**

After all checks pass and feature is verified in browser, squash merge the feature branch.
