# Instance Detail General Info Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich the instance detail overview tab with missing metadata (item hash, correct specs, explorer, SSH keys) and add a Payment tab.

**Architecture:** Rewrite the overview tab as a vertical card stack (Instance Details + SSH Keys). Add a new Payment tab component. Fix the `resources` field access bug in both overview and sidebar. Cross-reference SSH keys with `useSSHKeys()` for names.

**Tech Stack:** React, TypeScript, TanStack React Query, data-terminal design system, `@aleph-sdk/message` types

---

### Task 1: Fix resources field access bug in page.tsx sidebar

The sidebar accesses `instance.vcpus` and `instance.memory` via `Record<string, unknown>` casts. These fields are nested under `instance.resources`. Fix the sidebar to use correct paths and remove the unsafe casts.

**Files:**
- Modify: `packages/console/src/app/(console)/compute/[id]/page.tsx:61-71`

**Step 1: Fix the field access**

Replace lines 61-71:

```tsx
  const vcpus = String(
    (instance as Record<string, unknown>)['vcpus'] ?? '—',
  )
  const memory = String(
    (instance as Record<string, unknown>)['memory'] ?? '—',
  )
  const volumes = (
    (instance as Record<string, unknown>)['volumes'] as
      | Array<{ ref?: string; name?: string }>
      | undefined
  ) ?? []
```

With:

```tsx
  const vcpus = instance.resources?.vcpus ?? 0
  const memory = instance.resources?.memory ?? 0
  const volumes = instance.volumes ?? []
```

Note: `instance.volumes` is typed as `MachineVolume[]` from `InstanceContent`. The sidebar volume rendering (lines 218-230) accesses `.ref` and `.name` — `MachineVolume` has `ref` on some volume subtypes. Keep the existing rendering logic but remove the cast.

**Step 2: Update sidebar Summary card to use numbers**

Lines 154-155 currently show `{vcpus} vCPU`. Since `vcpus` is now a number, update lines 153-168:

```tsx
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>CPU</HudLabel>
                <span>{vcpus} vCPU</span>
              </div>
              <GlowLine />
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>RAM</HudLabel>
                <span>{memory} MB</span>
              </div>
              <GlowLine />
              <div className="flex items-center gap-3 text-sm">
                <HudLabel>Storage</HudLabel>
                <span>{instance.size ? `${instance.size} MB` : '—'}</span>
              </div>
```

No change needed — the template literal coerces numbers to strings. This step is just verification.

**Step 3: Update sidebar Related volumes card**

Lines 215-235: Replace the cast-based `volumes` with the new direct access. The `volumes.map` call accesses `.ref` and `.name`. The `MachineVolume` union type may not have `.name` on all subtypes — use type narrowing or optional chaining:

```tsx
          {volumes.length > 0 && (
            <TerminalCard tag="LINKS" label="Related">
              <div className="flex flex-col gap-3 p-4">
                {volumes.map((vol, i) => {
                  const ref = 'ref' in vol ? (vol as { ref?: string }).ref : undefined
                  const name = 'name' in vol ? (vol as { name?: string }).name : undefined
                  return (
                    <div
                      key={ref ?? i}
                      className="flex items-center gap-3 text-sm"
                    >
                      <StatusDot variant="success" />
                      <Badge variant="info">Volume</Badge>
                      <span className="font-mono text-xs truncate">
                        {name ||
                          (ref
                            ? truncateHash(ref)
                            : `Volume ${i + 1}`)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </TerminalCard>
          )}
```

**Step 4: Verify the page compiles**

Run: `pnpm --filter console exec tsc --noEmit 2>&1 | head -20`

If there are pre-existing type errors (e.g., data-terminal button.tsx), ignore those. Verify no NEW errors from our changes.

**Step 5: Commit**

```bash
git add packages/console/src/app/\(console\)/compute/\[id\]/page.tsx
git commit -m "fix: use instance.resources for vCPU/RAM in sidebar"
```

---

### Task 2: Rewrite overview tab with Instance Details card

Replace the current overview tab with a vertical stack. First card: Instance Details with item hash, specs, explorer, created date.

**Files:**
- Modify: `packages/console/src/components/compute/detail/overview-tab.tsx` (full rewrite)

**Step 1: Rewrite the overview tab**

Replace the entire file content with:

```tsx
'use client'

import {
  CopyButton,
  GlowLine,
  HudLabel,
  TerminalCard,
  Text,
} from '@/components/data-terminal'
import { useSSHKeys } from '@/hooks/queries/use-ssh-keys'
import { formatDate, truncateHash } from '@/lib/format'
import type { Instance } from 'aleph-sdk'
import type { SSHKey } from 'aleph-sdk'
import { Cpu, ExternalLink, HardDrive, Key, MemoryStick } from 'lucide-react'

interface OverviewTabProps {
  instance: Instance
}

export function OverviewTab({ instance }: OverviewTabProps) {
  const { data: sshKeys } = useSSHKeys()

  const authorizedKeys: string[] = instance.authorized_keys ?? []

  const matchedKeys = authorizedKeys.map((pubKey) => {
    const match = sshKeys?.find((sk) => sk.key === pubKey)
    return match ?? null
  })

  return (
    <div className="flex flex-col gap-4">
      <InstanceDetailsCard instance={instance} />
      <SSHKeysCard
        authorizedKeys={authorizedKeys}
        matchedKeys={matchedKeys}
      />
    </div>
  )
}

function InstanceDetailsCard({ instance }: { instance: Instance }) {
  const vcpus = instance.resources?.vcpus ?? 0
  const memory = instance.resources?.memory ?? 0

  return (
    <TerminalCard tag="SYS" label="Instance Details">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3 text-sm">
          <HudLabel>Item Hash</HudLabel>
          <span className="font-mono text-xs truncate">{instance.id}</span>
          <CopyButton text={instance.id} />
        </div>
        <GlowLine />
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-accent" />
            <HudLabel>CPU</HudLabel>
            <span>{vcpus} vCPU</span>
          </div>
          <div className="flex items-center gap-2">
            <MemoryStick size={14} className="text-accent" />
            <HudLabel>RAM</HudLabel>
            <span>{memory} MB</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive size={14} className="text-accent" />
            <HudLabel>Storage</HudLabel>
            <span>{instance.size ? `${instance.size} MB` : '—'}</span>
          </div>
        </div>
        <GlowLine />
        <div className="flex items-center gap-3 text-sm">
          <HudLabel>Explorer</HudLabel>
          <a
            href={instance.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline font-mono text-xs inline-flex items-center gap-1"
          >
            {instance.url}
            <ExternalLink size={12} />
          </a>
        </div>
        <GlowLine />
        <div className="flex items-center gap-3 text-sm">
          <HudLabel>Created</HudLabel>
          <span>{formatDate(instance.date)}</span>
        </div>
      </div>
    </TerminalCard>
  )
}

function SSHKeysCard({
  authorizedKeys,
  matchedKeys,
}: {
  authorizedKeys: string[]
  matchedKeys: (SSHKey | null)[]
}) {
  return (
    <TerminalCard tag="AUTH" label="SSH Keys">
      <div className="flex flex-col gap-3 p-4">
        {authorizedKeys.length === 0 ? (
          <Text variant="muted">No SSH keys configured.</Text>
        ) : (
          authorizedKeys.map((pubKey, i) => {
            const match = matchedKeys[i]
            return (
              <div key={match?.id ?? i}>
                <div className="flex items-center gap-3 text-sm">
                  <Key size={14} className="text-accent" />
                  {match ? (
                    <>
                      <span>{match.label || match.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {truncateHash(match.id)}
                      </span>
                    </>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground truncate">
                      {truncateHash(pubKey, 16)}
                    </span>
                  )}
                </div>
                {i < authorizedKeys.length - 1 && <GlowLine />}
              </div>
            )
          })
        )}
      </div>
    </TerminalCard>
  )
}
```

**Step 2: Verify it compiles**

Run: `pnpm --filter console exec tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add packages/console/src/components/compute/detail/overview-tab.tsx
git commit -m "feat: rewrite overview tab with instance details and SSH keys"
```

---

### Task 3: Create Payment tab component

New file for the Payment tab. Shows payment type and blockchain chain name.

**Files:**
- Create: `packages/console/src/components/compute/detail/payment-tab.tsx`

**Step 1: Create the payment tab component**

```tsx
'use client'

import {
  GlowLine,
  HudLabel,
  TerminalCard,
  Text,
} from '@/components/data-terminal'
import { formatDate } from '@/lib/format'
import type { Instance } from 'aleph-sdk'
import { blockchains } from 'aleph-sdk'

function formatPaymentType(type: string): string {
  if (type === 'hold') return 'Hold'
  if (type === 'superfluid') return 'Stream (PAYG)'
  return type
}

function formatChainName(chain: string): string {
  const config = blockchains[chain]
  if (config) return config.name
  return chain
}

interface PaymentTabProps {
  instance: Instance
}

export function PaymentTab({ instance }: PaymentTabProps) {
  const payment = instance.payment

  if (!payment) {
    return (
      <TerminalCard tag="PAY" label="Payment">
        <div className="p-4">
          <Text variant="muted">No payment information available.</Text>
        </div>
      </TerminalCard>
    )
  }

  return (
    <TerminalCard tag="PAY" label="Payment">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3 text-sm">
          <HudLabel>Type</HudLabel>
          <span>{formatPaymentType(payment.type)}</span>
        </div>
        <GlowLine />
        <div className="flex items-center gap-3 text-sm">
          <HudLabel>Blockchain</HudLabel>
          <span>{formatChainName(payment.chain)}</span>
        </div>
        <GlowLine />
        <div className="flex items-center gap-3 text-sm">
          <HudLabel>Start Date</HudLabel>
          <span>{formatDate(instance.time)}</span>
        </div>
      </div>
    </TerminalCard>
  )
}
```

**Step 2: Verify it compiles**

Run: `pnpm --filter console exec tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add packages/console/src/components/compute/detail/payment-tab.tsx
git commit -m "feat: add payment tab component"
```

---

### Task 4: Wire Payment tab into page and update tab order

Add the Payment tab import and insert it between Networking and Settings in the tab array.

**Files:**
- Modify: `packages/console/src/app/(console)/compute/[id]/page.tsx:18-131`

**Step 1: Add the import**

After line 21 (`import { SettingsTab }...`), add:

```tsx
import { PaymentTab } from '@/components/compute/detail/payment-tab'
```

**Step 2: Add Payment tab to the tabs array**

Insert after the Networking tab entry (after line 120) and before the Settings tab entry:

```tsx
              {
                label: 'Payment',
                content: <PaymentTab instance={instance} />,
              },
```

Full tabs array should be:
```tsx
          <TerminalTabs
            tabs={[
              {
                label: 'Overview',
                content: <OverviewTab instance={instance} />,
              },
              {
                label: 'Logs',
                content: <LogsTab instanceId={instance.id} />,
              },
              {
                label: 'Networking',
                content: <NetworkingTab instance={instance} />,
              },
              {
                label: 'Payment',
                content: <PaymentTab instance={instance} />,
              },
              {
                label: 'Settings',
                content: (
                  <SettingsTab
                    instance={instance}
                    onDelete={() => setShowDelete(true)}
                    isDeleting={deleteInstance.isPending}
                  />
                ),
              },
            ]}
          />
```

**Step 3: Verify it compiles**

Run: `pnpm --filter console exec tsc --noEmit 2>&1 | head -20`

**Step 4: Commit**

```bash
git add packages/console/src/app/\(console\)/compute/\[id\]/page.tsx
git commit -m "feat: wire payment tab into instance detail page"
```

---

### Task 5: Update detail page template doc

Update the template design doc to reflect the new tab structure for instances.

**Files:**
- Modify: `docs/plans/2026-02-19-detail-page-template-design.md:119-144`

**Step 1: Update the Instance section**

Replace lines 119-144:

```markdown
### Instance

**Tabs:** Overview | Logs | Networking | Payment | Settings

**Overview tab (vertical card stack):**
- SYS card: item hash (copyable), specs row (CPU/RAM/Storage), explorer link, created date
- AUTH card: SSH keys cross-referenced with user's key list (name + truncated ID)

**Logs tab:**
- Log level filter dropdown + search input + auto-scroll toggle
- TerminalWindow for log output

**Networking tab:**
- STORAGE card: attached volumes with mount points, "Attach Volume" drawer button
- DNS card: linked domains, "Link Domain" drawer button

**Payment tab:**
- PAY card: payment type (Hold/Stream), blockchain name, start date

**Settings tab:**
- CONFIG card: name, SSH keys reference, env vars
- DANGER card: delete with highRisk modal

**Sidebar:**
- Info: status, vCPUs, RAM, storage, created date
- Actions: Start, Stop, Reboot + Delete (danger)
- Related: linked volumes
```

**Step 2: Commit**

```bash
git add docs/plans/2026-02-19-detail-page-template-design.md
git commit -m "docs: update detail page template with instance payment tab"
```

---

### Task 6: Visual verification

**Step 1: Start the dev server**

Run: `pnpm dev`

**Step 2: Navigate to an instance detail page**

Open a browser and navigate to an instance detail page. Verify:

1. **Overview tab**: Instance Details card shows item hash (full, with copy), specs row (CPU/RAM/Storage with actual numbers, not dashes), explorer link, created date. SSH Keys card shows matched key names or fallback truncated keys.
2. **Payment tab**: Shows payment type, blockchain name, start date. Or "No payment information" if no payment field.
3. **Sidebar**: CPU/RAM show actual numbers, not dashes.
4. **Tab order**: Overview | Logs | Networking | Payment | Settings.
5. **Mobile**: Cards stack vertically, sidebar below main content.

---

### Task 7: Update project docs

Update ARCHITECTURE.md, DECISIONS.md, CLAUDE.md, and BACKLOG.md before merging.

**No new SDK API calls** — this work uses fields already on the `Instance` type (`resources`, `authorized_keys`, `payment`, `time`) and the existing `useSSHKeys()` hook. No new manager methods or query hooks were added, so no SDK documentation updates are needed.

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DECISIONS.md`
- Modify: `CLAUDE.md`
- Modify: `docs/BACKLOG.md`

**Step 1: Update ARCHITECTURE.md**

In the "Resource Detail Page Pattern" section (line 118), update the instance description to mention 5 tabs and the SSH key cross-reference pattern. Replace the parenthetical:

> Instance has 4 tabs (Overview, Logs, Networking, Settings) with extracted tab components.

With:

> Instance has 5 tabs (Overview, Logs, Networking, Payment, Settings) with extracted tab components. The Overview tab cross-references `instance.authorized_keys` with the user's SSH key list (`useSSHKeys()`) to show key names alongside IDs.

**Step 2: Add Decision #17 to DECISIONS.md**

Add at the top of the decisions list:

```markdown
## Decision #17 - 2026-02-19
**Context:** Instance detail page missing general information. Payment data (type, chain) displayed inline vs separate tab.
**Decision:** Payment gets its own tab (between Networking and Settings). Overview tab restructured to vertical card stack (Instance Details + SSH Keys). Hold/PAYG payment display kept minimal (type + chain only) since credits will replace them.
**Rationale:** Payment as a dedicated tab gives room for the upcoming credits system without cluttering overview. Minimal payment display avoids investing in UI for a payment model being phased out.
**Alternatives considered:** Payment inline in overview card (rejected — cramped, no room for credits expansion). Full Superfluid stream details (rejected — credits replacing hold/stream soon).
```

**Step 3: Update CLAUDE.md Current Features**

In the "Current Features" list, update the instance detail page bullet:

> - Instance detail page: 4-tab layout (overview specs, logs terminal, networking/volumes, settings/danger zone) with start/stop/reboot/delete actions

To:

> - Instance detail page: 5-tab layout (overview with instance details + SSH keys, logs terminal, networking/volumes, payment type/chain, settings/danger zone) with start/stop/reboot/delete actions

**Step 4: Update BACKLOG.md**

Move "Instance detail: General information section" from Open Items to Completed section with date and summary.

**Step 5: Commit**

```bash
git add docs/ARCHITECTURE.md docs/DECISIONS.md CLAUDE.md docs/BACKLOG.md
git commit -m "docs: update architecture, decisions, and features for instance detail info"
```

---

### Task 8: Squash merge

After all tasks pass and docs are updated, squash merge to main with all changes.
