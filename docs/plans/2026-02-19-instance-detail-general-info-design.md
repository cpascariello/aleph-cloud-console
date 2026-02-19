# Instance Detail: General Information Design

Enrich the instance detail page overview tab with missing metadata and add a Payment tab.

---

## Problem

The instance detail overview tab shows minimal information: specs (broken — accessing wrong fields), created date, uptime, and an explorer link. The v1 console shows item hash, specs, explorer, SSH key names, and payment details. Our v2 is missing most of this.

Additionally, `instance.resources.vcpus` and `instance.resources.memory` are accessed as `instance.vcpus` / `instance.memory` via unsafe `Record<string, unknown>` casts, resulting in dashes instead of actual values.

## Scope

**In scope:**
- Restructure overview tab with Instance Details + SSH Keys cards
- Add Payment tab (type + chain + start date)
- Fix `resources` field access bug (overview + sidebar)
- Cross-reference SSH keys with user's key list for names

**Out of scope:**
- Hosting CRN info (requires status API — backlog item #2)
- Connection methods / IPv4 / IPv6 (backlog item #2)
- Stream payment flow rates / Superfluid details (deferred — credits replacing hold/stream)
- Live logs (backlog item #3)

## Design

### Overview Tab

Replace the current 2-column card grid with a vertical stack of two TerminalCards.

**Card 1 — Instance Details** (`tag="SYS"`, `label="Instance Details"`):
- **Item Hash**: Full `instance.id` with `CopyButton`
- **Specs row**: Three items with `GlowLine` separators
  - CPU: `instance.resources.vcpus` vCPU
  - RAM: `instance.resources.memory` MB
  - Storage: `instance.size` MB
- **Explorer**: `instance.url` as external link with `ExternalLink` icon
- **Created**: `formatDate(instance.date)`

**Card 2 — SSH Keys** (`tag="AUTH"`, `label="SSH Keys"`):
- Fetch user's SSH keys via `useSSHKeys()` hook
- Match `instance.authorized_keys[]` against `sshKey.key` from the user's key list
- Per matched key: `Key` icon + key name (`sshKey.label || sshKey.name`) + truncated key ID (`truncateHash(sshKey.id)`)
- Unmatched keys (orphaned): `Key` icon + truncated public key string
- No keys: "No SSH keys configured" message

### Payment Tab

New tab inserted between Networking and Settings: `[Overview] [Logs] [Networking] [Payment] [Settings]`

**Single TerminalCard** (`tag="PAY"`, `label="Payment"`):
- **Type**: "Hold" or "Stream" from `instance.payment?.type` (mapped from `PaymentType` enum)
- **Blockchain**: Chain name from `instance.payment?.chain` (looked up via `blockchains` record from constants)
- **Start Date**: `formatDate(instance.time)` (unix timestamp on the message content)
- If `instance.payment` is undefined: "No payment information available" muted text

### Bug Fixes

- Replace `(instance as Record<string, unknown>)['vcpus']` with `instance.resources.vcpus` in overview tab
- Replace `(instance as Record<string, unknown>)['memory']` with `instance.resources.memory` in overview tab
- Fix same access pattern in `page.tsx` sidebar Summary card
- Remove `Record<string, unknown>` casts entirely

### Data Flow

```
Instance type (InstanceContent & { id, name, url, date, size, confirmed })
├── instance.id                    → Item hash (overview + header)
├── instance.resources.vcpus       → CPU (overview + sidebar)
├── instance.resources.memory      → RAM (overview + sidebar)
├── instance.size                  → Storage (overview + sidebar)
├── instance.url                   → Explorer link (overview)
├── instance.date                  → Created date (overview + sidebar)
├── instance.time                  → Payment start date (payment tab)
├── instance.authorized_keys[]     → SSH key matching (overview)
├── instance.payment?.type         → Payment type badge (payment tab)
└── instance.payment?.chain        → Blockchain name (payment tab)

useSSHKeys() query
└── SSHKey[] → cross-reference by key content for names/IDs
```

## Files Changed

1. `packages/console/src/components/compute/detail/overview-tab.tsx` — Rewrite: vertical card stack, fix field access, add SSH key cross-reference
2. `packages/console/src/components/compute/detail/payment-tab.tsx` — New: Payment tab component
3. `packages/console/src/app/(console)/compute/[id]/page.tsx` — Add Payment tab, fix `resources` field access in sidebar
4. `docs/plans/2026-02-19-detail-page-template-design.md` — Update instance tab list to include Payment

## Template Compliance

Follows the unified detail page template:
- Layout: `grid-cols-[1fr_320px]` with sticky sidebar (unchanged)
- Header: icon + title + status + ID row (unchanged)
- Tabs: Overview first, Settings last, Payment as resource-specific tab in between
- Sidebar: INFO/CMD/LINKS cards (unchanged)
- Overview changes from 2-col grid to vertical stack (richer content warrants it)
