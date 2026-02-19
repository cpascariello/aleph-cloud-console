# Connection Methods Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Display IPv4/IPv6 addresses, SSH commands, and port mappings on the instance detail Networking tab.

**Architecture:** Two new React Query hooks (`useExecutableStatus`, `useForwardedPorts`) wrap existing SDK methods (`ExecutableManager.checkStatus`, `ForwardedPortsManager.getByEntityHash`). Two new UI components (`ConnectionMethods`, `PortForwardingTable`) render inside the existing `NetworkingTab`. Read-only display; no port mutation.

**Tech Stack:** React Query, TypeScript, data-terminal design system (TerminalCard, TerminalTabs, CopyButton, Badge, Skeleton)

---

### Task 1: `useExecutableStatus` hook

**Files:**
- Create: `packages/console/src/hooks/queries/use-executable-status.ts`

**Step 1: Write the hook**

```typescript
import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import type { Instance, ExecutableStatus } from 'aleph-sdk'

export const executableStatusKeys = {
  detail: (id: string) => ['executable-status', id] as const,
}

export function useExecutableStatus(instance: Instance | undefined) {
  const { instanceManager } = useManagers()

  return useQuery<ExecutableStatus | undefined>({
    queryKey: executableStatusKeys.detail(instance?.id ?? ''),
    queryFn: () => instanceManager.checkStatus(instance!),
    enabled: !!instance,
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 10_000,
  })
}
```

**Step 2: Verify types compile**

Run: `pnpm --filter console exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors related to `use-executable-status.ts`

**Step 3: Commit**

```bash
git add packages/console/src/hooks/queries/use-executable-status.ts
git commit -m "feat: add useExecutableStatus hook for CRN status polling"
```

---

### Task 2: `useForwardedPorts` hook

**Files:**
- Create: `packages/console/src/hooks/queries/use-forwarded-ports.ts`

**Step 1: Write the hook**

This hook fetches forwarded port configuration from the Aleph aggregate, then merges with `mappedPorts` from the CRN status to produce a flat list with source, destination (host port), and protocol flags.

```typescript
import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import type { ExecutableStatus, PortProtocol } from 'aleph-sdk'

export type ForwardedPort = {
  source: number
  destination: number | undefined
  tcp: boolean
  udp: boolean
  isSystem: boolean
}

const SYSTEM_PORTS = new Set([22])

export const forwardedPortKeys = {
  detail: (id: string) => ['forwarded-ports', id] as const,
}

function mergePortsWithMappings(
  aggregatePorts: Record<number, PortProtocol>,
  mappedPorts: NonNullable<ExecutableStatus['mappedPorts']>,
): ForwardedPort[] {
  const allSources = new Set([
    ...SYSTEM_PORTS,
    ...Object.keys(aggregatePorts).map(Number),
  ])

  return Array.from(allSources)
    .sort((a, b) => a - b)
    .map((source) => {
      const proto = aggregatePorts[source]
      const mapped = mappedPorts[String(source)]
      return {
        source,
        destination: mapped?.host,
        tcp: mapped?.tcp ?? proto?.tcp ?? true,
        udp: mapped?.udp ?? proto?.udp ?? false,
        isSystem: SYSTEM_PORTS.has(source),
      }
    })
}

export function useForwardedPorts(
  instanceId: string | undefined,
  executableStatus: ExecutableStatus | undefined,
) {
  const { forwardedPortsManager } = useManagers()

  return useQuery<ForwardedPort[]>({
    queryKey: forwardedPortKeys.detail(instanceId ?? ''),
    queryFn: async () => {
      const existing = instanceId
        ? await forwardedPortsManager.getByEntityHash(instanceId)
        : undefined
      const aggregatePorts = existing?.ports ?? {}
      const mappedPorts = executableStatus?.mappedPorts ?? {}

      return mergePortsWithMappings(aggregatePorts, mappedPorts)
    },
    enabled: !!instanceId && !!executableStatus,
    staleTime: 30_000,
  })
}
```

**Step 2: Verify types compile**

Run: `pnpm --filter console exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors related to `use-forwarded-ports.ts`

**Step 3: Commit**

```bash
git add packages/console/src/hooks/queries/use-forwarded-ports.ts
git commit -m "feat: add useForwardedPorts hook for port mapping display"
```

---

### Task 3: SSH command helpers

**Files:**
- Create: `packages/console/src/lib/ssh.ts`

**Step 1: Write the helpers**

These pure functions compute SSH commands from executable status + forwarded ports.

```typescript
import type { ExecutableStatus } from 'aleph-sdk'
import type { ForwardedPort } from '@/hooks/queries/use-forwarded-ports'

export function getSSHForwardedPort(
  ports: ForwardedPort[],
): number | undefined {
  const sshPort = ports.find((p) => p.source === 22)
  return sshPort?.destination
}

export function getIPv4Address(
  status: ExecutableStatus,
): string | undefined {
  return status.ipv4Parsed ?? status.hostIpv4 ?? undefined
}

export function getIPv6Address(
  status: ExecutableStatus,
): string | undefined {
  return status.ipv6Parsed ?? undefined
}

export function formatSSHCommand(
  ip: string,
  port?: number,
): string {
  const portFlag = port ? ` -p ${port}` : ''
  return `ssh root@${ip}${portFlag}`
}
```

**Step 2: Verify types compile**

Run: `pnpm --filter console exec tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add packages/console/src/lib/ssh.ts
git commit -m "feat: add SSH command formatting helpers"
```

---

### Task 4: `ConnectionMethods` component

**Files:**
- Create: `packages/console/src/components/compute/detail/connection-methods.tsx`

**Step 1: Write the component**

Displays IPv4/IPv6 tabs with SSH command and IP address, each with copy buttons. Shows skeleton while loading, error state if CRN unreachable.

```typescript
'use client'

import {
  Badge,
  CopyButton,
  HudLabel,
  Skeleton,
  TerminalCard,
  TerminalTabs,
  Text,
} from '@/components/data-terminal'
import type { ExecutableStatus } from 'aleph-sdk'
import type { ForwardedPort } from '@/hooks/queries/use-forwarded-ports'
import {
  formatSSHCommand,
  getIPv4Address,
  getIPv6Address,
  getSSHForwardedPort,
} from '@/lib/ssh'
import { AlertTriangle, Terminal } from 'lucide-react'

interface ConnectionMethodsProps {
  status: ExecutableStatus | undefined
  ports: ForwardedPort[]
  isPending: boolean
  isError: boolean
}

function ConnectionDetail({
  label,
  value,
}: {
  label: string
  value: string | undefined
}) {
  if (!value) return null

  return (
    <div className="flex flex-col gap-1">
      <HudLabel>{label}</HudLabel>
      <div className="flex items-center gap-2 rounded bg-background/50 px-3 py-2 font-mono text-sm">
        <Terminal size={14} className="shrink-0 text-accent" />
        <span className="truncate">{value}</span>
        <CopyButton text={value} />
      </div>
    </div>
  )
}

function ConnectionTab({
  sshCommand,
  ip,
  ipLabel,
}: {
  sshCommand: string | undefined
  ip: string | undefined
  ipLabel: string
}) {
  if (!sshCommand && !ip) {
    return <Text variant="muted">Not available for this instance.</Text>
  }

  return (
    <div className="flex flex-col gap-3">
      <ConnectionDetail label="SSH Command" value={sshCommand} />
      <ConnectionDetail label={ipLabel} value={ip} />
    </div>
  )
}

export function ConnectionMethods({
  status,
  ports,
  isPending,
  isError,
}: ConnectionMethodsProps) {
  if (isPending) {
    return (
      <TerminalCard tag="CONN" label="Connection Methods">
        <div className="flex flex-col gap-3 p-4">
          <Skeleton variant="text" />
          <Skeleton variant="text" />
          <Skeleton variant="text" />
        </div>
      </TerminalCard>
    )
  }

  if (isError || !status) {
    return (
      <TerminalCard tag="CONN" label="Connection Methods">
        <div className="flex items-center gap-3 p-4 text-sm text-warning">
          <AlertTriangle size={16} />
          <Text variant="muted">
            Unable to reach compute node. Connection details unavailable.
          </Text>
        </div>
      </TerminalCard>
    )
  }

  const ipv4 = getIPv4Address(status)
  const ipv6 = getIPv6Address(status)
  const sshPort = getSSHForwardedPort(ports)

  const ipv4SSHCommand = ipv4
    ? formatSSHCommand(ipv4, sshPort)
    : undefined
  const ipv6SSHCommand = ipv6
    ? formatSSHCommand(ipv6)
    : undefined

  const tabs = [
    {
      label: 'IPv4',
      content: (
        <ConnectionTab
          sshCommand={ipv4SSHCommand}
          ip={ipv4}
          ipLabel="IPv4"
        />
      ),
    },
    {
      label: 'IPv6',
      content: (
        <ConnectionTab
          sshCommand={ipv6SSHCommand}
          ip={ipv6}
          ipLabel="IPv6"
        />
      ),
    },
  ]

  return (
    <TerminalCard tag="CONN" label="Connection Methods">
      <div className="p-4">
        <TerminalTabs tabs={tabs} />
      </div>
    </TerminalCard>
  )
}
```

**Step 2: Verify types compile**

Run: `pnpm --filter console exec tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add packages/console/src/components/compute/detail/connection-methods.tsx
git commit -m "feat: add ConnectionMethods component with IPv4/IPv6 tabs"
```

---

### Task 5: `PortForwardingTable` component

**Files:**
- Create: `packages/console/src/components/compute/detail/port-forwarding-table.tsx`

**Step 1: Write the component**

Read-only table showing source port, destination (host) port, and TCP/UDP protocol indicators.

```typescript
'use client'

import {
  Badge,
  HudLabel,
  Skeleton,
  TerminalCard,
  Text,
} from '@/components/data-terminal'
import type { ForwardedPort } from '@/hooks/queries/use-forwarded-ports'

interface PortForwardingTableProps {
  ports: ForwardedPort[]
  isPending: boolean
}

export function PortForwardingTable({
  ports,
  isPending,
}: PortForwardingTableProps) {
  if (isPending) {
    return (
      <TerminalCard tag="PORTS" label="Port Forwarding">
        <div className="flex flex-col gap-3 p-4">
          <Skeleton variant="text" />
          <Skeleton variant="text" />
        </div>
      </TerminalCard>
    )
  }

  if (ports.length === 0) {
    return (
      <TerminalCard tag="PORTS" label="Port Forwarding">
        <div className="p-4">
          <Text variant="muted">No port forwarding configured.</Text>
        </div>
      </TerminalCard>
    )
  }

  return (
    <TerminalCard tag="PORTS" label="Port Forwarding">
      <div className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 pr-4 font-display text-[11px] tracking-wider text-muted-foreground">
                Source
              </th>
              <th className="pb-2 pr-4 font-display text-[11px] tracking-wider text-muted-foreground">
                Destination
              </th>
              <th className="pb-2 pr-4 font-display text-[11px] tracking-wider text-muted-foreground">
                Protocol
              </th>
            </tr>
          </thead>
          <tbody>
            {ports.map((port) => (
              <tr
                key={port.source}
                className="border-b border-border/50 last:border-0"
              >
                <td className="py-2 pr-4 font-mono">{port.source}</td>
                <td className="py-2 pr-4 font-mono">
                  {port.destination ?? '—'}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex gap-1">
                    {port.tcp && <Badge variant="neutral">TCP</Badge>}
                    {port.udp && <Badge variant="neutral">UDP</Badge>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TerminalCard>
  )
}
```

**Step 2: Verify types compile**

Run: `pnpm --filter console exec tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add packages/console/src/components/compute/detail/port-forwarding-table.tsx
git commit -m "feat: add read-only PortForwardingTable component"
```

---

### Task 6: Wire into NetworkingTab

**Files:**
- Modify: `packages/console/src/components/compute/detail/networking-tab.tsx`

**Step 1: Update NetworkingTab to show connection methods**

Add imports for the new hooks and components, call them with the instance, and render above the existing Volumes/Domains cards.

```typescript
'use client'

import {
  Badge,
  Button,
  GlowLine,
  TerminalCard,
  Text,
} from '@/components/data-terminal'
import { VolumeWizardContent } from '@/components/infrastructure/volume-wizard-content'
import { DomainWizardContent } from '@/components/infrastructure/domain-wizard-content'
import { ConnectionMethods } from '@/components/compute/detail/connection-methods'
import { PortForwardingTable } from '@/components/compute/detail/port-forwarding-table'
import { useDrawer } from '@/hooks/use-drawer'
import { useExecutableStatus } from '@/hooks/queries/use-executable-status'
import { useForwardedPorts } from '@/hooks/queries/use-forwarded-ports'
import { truncateHash } from '@/lib/format'
import type { Instance } from 'aleph-sdk'
import { Globe, HardDrive, Plus } from 'lucide-react'

interface NetworkingTabProps {
  instance: Instance
}

export function NetworkingTab({ instance }: NetworkingTabProps) {
  const { openDrawer, closeDrawer } = useDrawer()
  const {
    data: executableStatus,
    isPending: statusPending,
    isError: statusError,
  } = useExecutableStatus(instance)
  const { data: ports = [], isPending: portsPending } = useForwardedPorts(
    instance.id,
    executableStatus,
  )

  const volumes = (
    (instance as Record<string, unknown>)['volumes'] as
      | Array<{ ref?: string; mount?: string; name?: string }>
      | undefined
  ) ?? []

  const handleAttachVolume = () => {
    openDrawer({
      title: 'Attach Volume',
      tag: 'NEW',
      content: (
        <VolumeWizardContent
          variant="drawer"
          onComplete={closeDrawer}
          onBack={closeDrawer}
        />
      ),
    })
  }

  const handleLinkDomain = () => {
    openDrawer({
      title: 'Link Domain',
      tag: 'NEW',
      content: (
        <DomainWizardContent
          variant="drawer"
          defaultTargetRef={instance.id}
          onComplete={closeDrawer}
          onBack={closeDrawer}
        />
      ),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <ConnectionMethods
        status={executableStatus}
        ports={ports}
        isPending={statusPending}
        isError={statusError}
      />

      <PortForwardingTable
        ports={ports}
        isPending={statusPending || portsPending}
      />

      <TerminalCard tag="STORAGE" label="Volumes">
        {/* ... existing volumes content unchanged ... */}
      </TerminalCard>

      <TerminalCard tag="DNS" label="Domains">
        {/* ... existing domains content unchanged ... */}
      </TerminalCard>
    </div>
  )
}
```

Note: The volumes and domains card content stays exactly as-is. Only the imports and the two new components at the top of the return JSX are added.

**Step 2: Verify types compile**

Run: `pnpm --filter console exec tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Manual verification**

Run: `pnpm dev`
Navigate to an instance detail page → Networking tab. Verify:
- Connection Methods card appears with IPv4/IPv6 tabs
- SSH commands show with copy buttons
- Port Forwarding table shows below
- Skeleton states appear during load
- Error state appears if CRN is unreachable
- Volumes and Domains cards still render below

**Step 4: Commit**

```bash
git add packages/console/src/components/compute/detail/networking-tab.tsx
git commit -m "feat: wire connection methods and port forwarding into networking tab"
```

---

### Task 7: Verify and clean up

**Step 1: Run linter**

Run: `pnpm lint`
Fix any issues.

**Step 2: Run type check**

Run: `pnpm typecheck`
Fix any issues.

**Step 3: Run tests**

Run: `pnpm test`
Ensure no regressions.

**Step 4: Manual smoke test**

- Open an instance detail → Networking tab
- Verify IPv4 tab shows SSH command + IP
- Switch to IPv6 tab, verify SSH command + IP
- Check port forwarding table has at least port 22
- Check loading skeletons appear before data loads
- Check error state by disconnecting network briefly

**Step 5: Commit any fixes, then final commit**

```bash
git add -A
git commit -m "fix: address lint and type issues in connection methods"
```
