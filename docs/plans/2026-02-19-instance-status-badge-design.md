# Instance Status Badge Design

Replace the current `instance.confirmed` boolean badge with real CRN execution state across list and detail pages.

---

## Problem

Status badges use `instance.confirmed` (on-chain message confirmation) — green "Running" or yellow "Pending." An instance can be confirmed but not allocated to any CRN, stopped, or booting. The real execution state comes from `ExecutableManager.checkStatus()` which calls the CRN directly. The detail page already polls CRN status for connection methods but doesn't feed it into the badge.

## Status Model

Pure function `deriveInstanceStatus(executableStatus, isError, instance)` maps raw CRN data to a simplified badge + optional alert.

### Simplified Badge States

| CRN State | Badge Label | StatusDot | Alert Variant |
|-----------|-------------|-----------|---------------|
| `running` (startedAt set) | Running | `success` | None |
| `preparing` or `starting` | Booting | `warning` | `warning` |
| `stopping` or `stopped` | Stopped | `error` | `error` |
| Not allocated (no CRN) | Not Allocated | `neutral` | `error` |
| CRN unreachable (fetch failed) | Unknown | `warning` | `warning` |
| Loading (not yet fetched) | Fallback to `confirmed` logic | — | None |

### Derived Status Type

```typescript
type DerivedInstanceStatus = {
  label: string
  dotVariant: 'success' | 'warning' | 'error' | 'neutral'
  alert?: {
    variant: 'warning' | 'error'
    message: string
  }
}
```

## Detail Page: Alert Banner

Alert renders between the header (title + ID row) and `TerminalTabs`, inside the main content column. Only appears for non-running states.

Example messages:
- **Booting (warning):** "This instance is booting up. The compute node began preparation at {time}."
- **Stopped (error):** "This instance has stopped. The compute node reports it is no longer running."
- **Not Allocated (error):** "This instance is not allocated to any compute node."
- **CRN Unreachable (warning):** "Unable to reach the compute node. The displayed status may be outdated."

This replaces the connection methods card's inline error states for these conditions.

## List Page: Per-Instance CRN Polling

New `useInstanceStatuses(instances)` hook using TanStack `useQueries` to fire parallel `checkStatus` calls.

- **Poll interval:** 60s (vs 30s on detail page)
- **Stale time:** 30s
- **Graceful degradation:** While loading, fall back to `confirmed`-based display. Failed checks show "Unknown" with warning dot.
- **Scale:** Designed for single digits to ~20 instances per user.

## Detail Page Alert Pattern (cross-cutting)

Alerts for resource-level status conditions render between the header and TerminalTabs, inside the main content column. Only appear when there's something to communicate — no alert when healthy. Use `warning` for transitional/uncertain states, `error` for problem states. Applies to all detail pages.

The existing website "volume missing" alert migrates from inside the Current Version card to this position.

## Documentation Updates

- ARCHITECTURE.md: Add "Detail Page Alert Pattern" section, update "Connection Methods & CRN Status Pattern"
- CLAUDE.md: No feature list change (status badges already exist, this changes their data source)
- DECISIONS.md: Log the status model simplification and alert pattern decisions
- BACKLOG.md: Move this item to Completed
