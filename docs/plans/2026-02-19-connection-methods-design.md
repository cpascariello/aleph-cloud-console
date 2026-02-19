# Connection Methods Design

Display IPv4/IPv6 addresses, SSH commands, and port mappings on the instance detail Networking tab.

## Scope

Read-only display. No port forwarding management (add/remove/toggle) — deferred to follow-up.

## Data Source

The SDK already has the infrastructure:

- `ExecutableManager.checkStatus(instance)` → calls CRN to get `ExecutableStatus`
- `ExecutableManager.getAllocationCRN(instance)` → resolves CRN URL (scheduler API for hold, node catalog for stream)
- `ForwardedPortsManager` → reads port config from Aleph aggregates

`ExecutableStatus` shape (from CRN v2 response):
```
{
  ipv4, ipv6, ipv6Parsed,
  hostIpv4, ipv4Parsed,
  mappedPorts: Record<string, { host: number, tcp: boolean, udp: boolean }>,
  status: { running, startedAt, stoppedAt, ... }
}
```

## New Hooks

### `useExecutableStatus(instance)`
- Calls `instanceManager.checkStatus(instance)` via React Query
- Query key: `['executable-status', instanceId]`
- `enabled: !!instance`
- `refetchInterval: 30_000` (30s auto-poll)
- Returns `{ data: ExecutableStatus | undefined, isPending, isError }`

### `useForwardedPorts(instanceId, executableStatus)`
- Fetches port config from `ForwardedPortsManager.getByEntityHash(instanceId)`
- Merges aggregate ports with `executableStatus.mappedPorts` to show actual host mappings
- System port 22 (SSH) always included
- Returns `{ ports: ForwardedPort[], isPending }`

## UI Layout

Networking tab, above existing Volumes and Domains sections.

### Connection Methods Card (tag="CONN")
- IPv4 / IPv6 tabs via `TerminalTabs`
- Each tab shows:
  - SSH Command: copyable (`ssh root@<ip> -p <port>` for IPv4, `ssh root@<ipv6>` for IPv6)
  - IP Address: copyable
- Skeleton state while CRN status loads
- Error state if CRN unreachable

### Port Forwarding Card (tag="PORTS")
- Read-only table: Source | Destination | TCP | UDP
- Port 22 always shown
- Additional mapped ports from CRN status
- Empty state if only SSH port

## Loading Strategy

- Fetch on mount, auto-poll 30s
- Skeleton cards during initial load
- Error card if CRN unreachable ("Unable to reach compute node")
- Separate query lifecycle from instance data

## SSH Command Format

- IPv4: `ssh root@{ipv4Parsed || hostIpv4} -p {sshForwardedPort}`
- IPv6: `ssh root@{ipv6Parsed}`
- SSH forwarded port = destination port for source port 22 in mapped ports
