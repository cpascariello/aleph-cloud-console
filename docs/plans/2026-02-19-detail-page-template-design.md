# Detail Page Template Design

Unified layout for all resource detail pages (instance, volume, domain, website).

---

## Problem

Each detail page uses a different layout. Instance has tabs + a separate header component. Website uses a flat two-column card grid with an info row. Volume and domain are flat with inconsistent card arrangements. Delete lives in different places per resource (header, settings tab, or both).

## Design Decisions

1. **Tabs for all resources** -- consistent structure regardless of content density. Even simple resources (domain) get tabs. Provides a predictable navigation pattern.
2. **Dashboard-style sidebar** -- 320px sticky right column with info summary, actions, and related resources. Mirrors the connected dashboard layout (`grid-cols-[1fr_320px]`).
3. **Info promoted to sidebar** -- key stats (status, size, dates, cost) live in the sticky sidebar so they stay visible while navigating tabs.
4. **Delete in sidebar + Settings tab** -- not in the header. Sidebar has a delete button in the Actions card. Settings tab has a danger zone section. No trash icon in the header row.
5. **Standardized minimum tabs + extras** -- every resource gets Overview + Settings. Complex resources add specific tabs between them.

---

## General Template

```
PageHeader (breadcrumbs)
├── grid-cols-1 lg:grid-cols-[1fr_320px] gap-8
│
├── Main Content
│   ├── Header
│   │   ├── Row 1: Icon + Title + StatusDot + Badge(s)
│   │   └── Row 2: HudLabel "ID" + truncated hash + CopyButton
│   │
│   └── TerminalTabs
│       ├── Overview (always first)
│       │   └── grid-cols-1 md:grid-cols-2 gap-4 (two-column cards)
│       ├── [resource-specific tabs...]
│       └── Settings (always last)
│           ├── CONFIG card (if resource has configurable fields)
│           └── DANGER card (warning alert + delete button + modal)
│
└── Sidebar (320px, sticky, self-start)
    ├── TerminalCard tag="INFO" -- key-value pairs
    ├── TerminalCard tag="CMD"  -- action buttons
    └── TerminalCard tag="LINKS" -- related resource links
```

### Header Pattern

Every detail page renders the same header structure:

```tsx
<div className="flex flex-col gap-4">
  <div className="flex items-center gap-4">
    <ResourceIcon size={24} className="text-accent" />
    <h1 className="text-2xl font-heading">{name}</h1>
    <StatusDot variant={...} />
    <Badge variant={...}>{statusLabel}</Badge>
    {/* Optional extra badges */}
  </div>
  <div className="flex items-center gap-4 text-sm text-muted-foreground">
    <div className="flex items-center gap-2">
      <HudLabel>ID</HudLabel>
      <span className="font-mono">{truncateHash(id)}</span>
      <CopyButton text={id} />
    </div>
    {/* Optional badges (volume type, target type) */}
  </div>
</div>
```

### Sidebar Pattern

Sticky right column, stacks below main content on mobile:

```tsx
<div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
  {/* Info Summary */}
  <TerminalCard tag="INFO" label="Summary">
    {/* Key-value pairs with HudLabel + GlowLine dividers */}
  </TerminalCard>

  {/* Actions */}
  <TerminalCard tag="CMD" label="Actions">
    {/* Operational buttons + Delete (danger styled) */}
  </TerminalCard>

  {/* Related Resources */}
  <TerminalCard tag="LINKS" label="Related">
    {/* Links to connected entities */}
  </TerminalCard>
</div>
```

### Settings Tab Pattern

Every resource's Settings tab contains at minimum a danger zone:

```tsx
<div className="flex flex-col gap-4">
  {/* Optional: CONFIG card for editable fields */}
  <TerminalCard tag="DANGER" label="Danger Zone">
    <Alert variant="error">
      Deleting this {resourceType} is permanent and cannot be undone.
    </Alert>
    <Button variant="primary" onClick={...}>
      Delete {resourceType}
    </Button>
  </TerminalCard>
</div>
```

### Mobile Behavior

`grid-cols-1 lg:grid-cols-[1fr_320px]` -- sidebar stacks below main content on screens < lg. Header still shows name + status for immediate context.

---

## Per-Resource Specifications

### Instance

**Tabs:** Overview | Logs | Networking | Settings

**Overview tab (two-column cards):**
- SPECS card: CPU, RAM, storage (with Lucide icons)
- INFO card: created date, uptime, payment type
- ACCESS card (conditional): endpoint URL

**Logs tab:**
- Log level filter dropdown + search input + auto-scroll toggle
- TerminalWindow for log output

**Networking tab:**
- STORAGE card: attached volumes with mount points, "Attach Volume" drawer button
- DNS card: linked domains, "Link Domain" drawer button

**Settings tab:**
- CONFIG card: name, SSH keys reference, env vars
- DANGER card: delete with highRisk modal

**Sidebar:**
- Info: status, vCPUs, RAM, storage, payment method, created date
- Actions: Start, Stop, Reboot + Delete (danger)
- Related: linked volumes, linked domains

---

### Volume

**Tabs:** Overview | Settings

**Overview tab (two-column cards):**
- DETAILS card: size, explorer link (external), download link (external)
- LINKS card: linked instances, programs, websites (cross-entity lookup)

**Settings tab:**
- DANGER card: delete with highRisk modal

**Sidebar:**
- Info: status, volume type, size, created date, uptime
- Actions: Explorer (external), Download (external), Delete (danger)
- Related: linked instances, programs, websites (navigation shortcuts)

---

### Domain

**Tabs:** Overview | Settings

**Overview tab:**
- DNS card: instructions + CodeBlock with DNS records
- TARGET card: target type badge + reference hash with CopyButton

**Settings tab:**
- DANGER card: delete with modal

**Sidebar:**
- Info: status, target type, created date
- Actions: Delete (danger)
- Related: linked resource (target instance/program if resolvable)

---

### Website

**Tabs:** Overview | Settings

**Overview tab (two-column cards):**
- ACCESS cards: default gateway URL, alternative gateways template, ENS gateways
- VERSION card: version number, volume link (or missing alert), item hash, CID v0, CID v1

**Settings tab:**
- DANGER card: delete with modal

**Sidebar:**
- Info: status, framework, version, size (or "Unavailable"), created, updated
- Actions: Open gateway (external, conditional), Delete (danger)
- Related: volume link (or "Volume Missing" + ID)

---

## Migration Notes

Changes from current implementation:

1. **Instance:** Replace `DetailHeader` component with inline header pattern. Remove trash icon from header. Remove duplicate delete from header. Keep all 4 tabs. Add sidebar.
2. **Volume:** Add TerminalTabs (Overview + Settings). Move delete from header to sidebar + Settings danger zone. Add sidebar. Keep cross-entity linked resources lookup.
3. **Domain:** Add TerminalTabs (Overview + Settings). Move delete from header to sidebar + Settings danger zone. Add sidebar.
4. **Website:** Replace info row with sidebar info summary. Add TerminalTabs (Overview + Settings). Move delete from header to sidebar + Settings danger zone. Add sidebar. Card content stays the same.
5. **All:** Wrap in `grid-cols-[1fr_320px]` layout. Consistent header pattern.

## Future Scope (not in this implementation)

Content alignment with the live app (app.aleph.cloud) -- adding missing fields, actions, and sections. That is a separate brainstorm after structural refactoring is complete.
