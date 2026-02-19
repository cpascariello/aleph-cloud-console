# Website Detail Page Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the website detail page to full parity with the live console at aleph.cloud — showing gateway URLs, IPFS CIDs, version info, volume link, and ENS setup instructions.

**Architecture:** Three layers of changes: (1) add `multiformats` dep and CID utility to SDK, (2) fix the Website type and parser to include missing fields, (3) redesign the detail page UI. The gateway URL is derived client-side from the volume's item_hash (CID v0 → v1 conversion).

**Tech Stack:** multiformats (CID conversion), aleph-sdk types/managers, Next.js page component, data-terminal design system

---

### Task 1: Add `multiformats` dependency and CID utility

**Files:**
- Modify: `packages/aleph-sdk/package.json` (add dependency)
- Modify: `packages/aleph-sdk/src/utils.ts` (add utility function)
- Modify: `packages/aleph-sdk/src/index.ts` (export utility)

**Step 1: Add multiformats dependency**

```bash
pnpm --filter aleph-sdk add multiformats
```

**Step 2: Add `cidV0toV1` utility to `packages/aleph-sdk/src/utils.ts`**

Add at the end of the file:

```typescript
import { CID } from 'multiformats/cid'

/**
 * Convert an IPFS CID v0 (Qm...) to CID v1 (bafy...).
 */
export function cidV0toV1(cid: string): string {
  return CID.parse(cid).toV1().toString()
}
```

**Step 3: Export from `packages/aleph-sdk/src/index.ts`**

Add `cidV0toV1` to the utilities export block.

**Step 4: Add IPFS gateway constant to `packages/aleph-sdk/src/constants.ts`**

```typescript
export const ipfsGatewayBase = 'ipfs.aleph.sh'
```

Export it from `packages/aleph-sdk/src/index.ts` too.

**Step 5: Verify build**

```bash
pnpm --filter aleph-sdk typecheck
```

**Step 6: Commit**

```bash
git add packages/aleph-sdk/package.json packages/aleph-sdk/src/utils.ts packages/aleph-sdk/src/index.ts packages/aleph-sdk/src/constants.ts pnpm-lock.yaml
git commit -m "feat(sdk): add CID v0-to-v1 utility and IPFS gateway constant"
```

---

### Task 2: Add missing fields to Website types and parser

**Files:**
- Modify: `packages/aleph-sdk/src/types/website.ts:29-38` (WebsiteAggregateItem type)
- Modify: `packages/aleph-sdk/src/types/website.ts:52-64` (Website type)
- Modify: `packages/aleph-sdk/src/managers/website.ts:506-528` (parseAggregateItem method)

**Step 1: Update `WebsiteAggregateItem` in `packages/aleph-sdk/src/types/website.ts`**

The current type is missing `version`, `ens`, `created_at`, and `metadata`. The aggregate content actually stores:

```typescript
export type WebsiteAggregateItem = {
  metadata?: {
    name?: string
    tags?: string[]
    framework?: WebsiteFrameworkId
  }
  version?: number
  volume_id?: string
  volume_history?: string[]
  ens?: string
  created_at?: number | string
  updated_at: number | string
}
```

Remove the fields `type`, `programType`, `message_id`, `framework`, `name` — these don't exist at the top level in the actual aggregate. Framework and name come from `metadata`.

**Step 2: Update `Website` type in `packages/aleph-sdk/src/types/website.ts`**

Add three new fields:

```typescript
export type Website = {
  type: EntityType.Website
  id: string
  name: string
  url: string
  date: string
  created_at: string
  updated_at: string
  size: number
  version: number
  framework: WebsiteFrameworkId
  volume_id?: string
  volume_history?: string[]
  ens?: string
  confirmed?: boolean
}
```

**Step 3: Update `parseAggregateItem` in `packages/aleph-sdk/src/managers/website.ts:506-528`**

The current parser only destructures `framework`, `volume_id`, `volume_history`, `updated_at`. Update to also extract `version`, `ens`, `created_at`, and handle `metadata`:

```typescript
protected async parseAggregateItem(
  name: string,
  content: WebsiteAggregateItem,
): Promise<Website> {
  const {
    metadata,
    version,
    volume_id,
    volume_history,
    ens,
    created_at,
    updated_at,
  } = content
  const framework = metadata?.framework ?? WebsiteFrameworkId.None
  const displayName = metadata?.name ?? name
  const createdDate = created_at ? getDate(created_at) : getDate(updated_at)
  const updatedDate = getDate(updated_at)
  const website: Website = {
    id: name,
    name: displayName,
    type: EntityType.Website,
    framework,
    version: version ?? 1,
    created_at: createdDate,
    updated_at: updatedDate,
    date: createdDate,
    url: `/infrastructure/websites/${name}`,
    size: 0,
    confirmed: true,
  }
  if (volume_id !== undefined) website.volume_id = volume_id
  if (volume_history !== undefined)
    website.volume_history = volume_history
  if (ens !== undefined) website.ens = ens
  return website
}
```

Key changes:
- Extract `metadata`, `version`, `ens`, `created_at` from content
- Framework comes from `metadata.framework` (not top-level)
- Display name from `metadata.name` (not top-level)
- Separate `created_at` and `updated_at` dates
- Fix `url` to point to the console route (not `/storage/volume/`)

**Step 4: Update the `WebsiteFrameworkId` import**

The parser now needs `WebsiteFrameworkId` imported in `website.ts` manager. Check if it's already available — it should be via the constants import on line 20-24.

**Step 5: Verify build**

```bash
pnpm --filter aleph-sdk typecheck
```

**Step 6: Fix any type errors in consumers**

The `Website` type now has `created_at`, `version`, `ens` as new fields. Check console code for any places that construct `Website` objects manually or that break due to the type change.

```bash
pnpm --filter console typecheck
```

**Step 7: Commit**

```bash
git add packages/aleph-sdk/src/types/website.ts packages/aleph-sdk/src/managers/website.ts
git commit -m "feat(sdk): add version, ens, created_at to Website type and parser"
```

---

### Task 3: Redesign the website detail page

**Files:**
- Modify: `packages/console/src/app/(console)/infrastructure/websites/[id]/page.tsx` (full rewrite of page body)

**Step 1: Read the current file and plan the new layout**

The new layout should match the live console screenshot. Sections in order:

1. **Page header** (existing): name, status badge, delete button
2. **Info row**: framework, version, size, created on, updated on (horizontal row like the screenshot)
3. **Default Gateway card**: `https://{cidV1}.ipfs.aleph.sh` with copy + external link
4. **Alternative Gateways card**: template URL `https://{cidV1}.ipfs.<gateway-hostname>` (informational)
5. **ENS Gateways card**: setup instructions with `ipfs://{cidV1}` content hash and `https://<your-ens-name>.eth.limo` pattern
6. **Current Version card**: version number, volume details link, item hash, CID v0, CID v1

**Step 2: Rewrite the page component**

Replace the page body below PageHeader with the new layout. Key imports to add:

```typescript
import { cidV0toV1, ipfsGatewayBase, humanReadableSize } from 'aleph-sdk'
import Link from 'next/link'
import { ExternalLink, Globe, Key, Layers } from 'lucide-react'
```

The CID conversion: `website.volume_id` is the CID v0 (item_hash). Convert to v1:

```typescript
const cidV1 = website.volume_id ? cidV0toV1(website.volume_id) : null
const gatewayUrl = cidV1 ? `https://${cidV1}.${ipfsGatewayBase}` : null
```

**Info row** (replaces the old Details card):

```tsx
<div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
  <div><HudLabel>Framework</HudLabel><span>{frameworkLabel}</span></div>
  <div><HudLabel>Version</HudLabel><span>{website.version}</span></div>
  <div><HudLabel>Size</HudLabel><span>{humanReadableSize(website.size)}</span></div>
  <div><HudLabel>Created On</HudLabel><span>{website.created_at}</span></div>
  <div><HudLabel>Updated On</HudLabel><span>{website.updated_at}</span></div>
</div>
```

**Default Gateway card:**

```tsx
<TerminalCard tag="ACCESS" label="Default Gateway">
  <div className="flex items-center gap-2 p-4 text-sm">
    <a href={gatewayUrl} target="_blank" rel="noopener noreferrer"
       className="text-accent hover:underline font-mono text-xs break-all">
      {gatewayUrl}
    </a>
    <CopyButton text={gatewayUrl} />
    <a href={gatewayUrl} target="_blank" rel="noopener noreferrer">
      <ExternalLink size={14} className="text-muted-foreground" />
    </a>
  </div>
</TerminalCard>
```

**Alternative Gateways card:**

```tsx
<TerminalCard tag="ACCESS" label="Alternative Gateways">
  <div className="flex flex-col gap-2 p-4 text-sm">
    <span className="font-mono text-xs text-muted-foreground break-all">
      https://{cidV1}.ipfs.&lt;gateway-hostname&gt;
    </span>
    <CopyButton text={`https://${cidV1}.ipfs.`} />
  </div>
</TerminalCard>
```

**ENS Gateways card (informational):**

```tsx
<TerminalCard tag="ACCESS" label="ENS Gateways">
  <div className="flex flex-col gap-3 p-4 text-sm">
    <p className="text-muted-foreground">
      Access your ENS and setup the content hash to this current version:
    </p>
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-accent break-all">
        ipfs://{cidV1}
      </span>
      <CopyButton text={`ipfs://${cidV1}`} />
    </div>
    <p className="text-muted-foreground">
      Then, your website will be accessible via:
    </p>
    <span className="font-mono text-xs text-accent">
      https://&lt;your-ens-name&gt;.eth.limo
    </span>
  </div>
</TerminalCard>
```

**Current Version card:**

```tsx
<TerminalCard tag="VERSION" label="Current Version">
  <div className="flex flex-col gap-3 p-4">
    <div className="flex items-center gap-3 text-sm">
      <HudLabel>Version {website.version}</HudLabel>
    </div>
    <GlowLine />
    <div className="flex items-center gap-3 text-sm">
      <HudLabel>Volume details</HudLabel>
      <Link href={`/infrastructure/volumes/${website.volume_id}`}
            className="text-accent hover:underline text-xs">
        Volume details
      </Link>
    </div>
    <GlowLine />
    <div className="flex items-center gap-3 text-sm">
      <HudLabel>Item Hash</HudLabel>
      <span className="font-mono text-xs break-all">{website.volume_id}</span>
      <CopyButton text={website.volume_id} />
    </div>
    <GlowLine />
    <div className="flex items-center gap-3 text-sm">
      <HudLabel>IPFS CID V0</HudLabel>
      <span className="font-mono text-xs break-all">{website.volume_id}</span>
      <CopyButton text={website.volume_id} />
    </div>
    <GlowLine />
    <div className="flex items-center gap-3 text-sm">
      <HudLabel>IPFS CID V1</HudLabel>
      <span className="font-mono text-xs break-all">{cidV1}</span>
      <CopyButton text={cidV1} />
    </div>
  </div>
</TerminalCard>
```

**Step 3: Verify build and test visually**

```bash
pnpm --filter console typecheck
pnpm dev
```

Visit a website detail page and compare with the live console screenshot.

**Step 4: Commit**

```bash
git add packages/console/src/app/(console)/infrastructure/websites/[id]/page.tsx
git commit -m "feat: redesign website detail page with gateway URLs, CIDs, and version info"
```

---

### Task 4: Verify volume linkage

**Files:**
- Read: `packages/console/src/app/(console)/infrastructure/volumes/[id]/page.tsx:82-90`
- Read: `packages/console/src/hooks/queries/use-websites.ts`

**Step 1: Verify the linkage logic is correct**

The volume detail page at line 82-90 checks `website.volume_id === id`. This should work correctly because:
- `useWebsites()` returns parsed `Website[]` with `volume_id` field
- The `parseAggregateItem` sets `volume_id` from the aggregate content

The user's reported issue ("volume doesn't show as linked") was likely caused by navigating to the wrong URL (`/storage/volume/{id}` instead of `/infrastructure/volumes/{id}`), since `website.url` was set to the broken relative path. Task 2 fixes this by correcting the URL field.

**Step 2: Test with the specific volume**

Navigate to `/infrastructure/volumes/c23a24980ae60fc72a8ce7d056aa5188d91ea76478a429014e681334dabd0464` while wallet is connected. Verify the website linkage appears in the Linked Resources card.

**Step 3: If linkage still doesn't show, check `volume_history` matching**

The volume detail page only checks `website.volume_id` (current volume). If the volume is in `volume_history` but not the current `volume_id`, it won't show as linked. This is expected behavior — only the active volume is "linked." If this is the case, no code change needed.

---

### Task 5: Final verification and cleanup

**Step 1: Full typecheck**

```bash
pnpm typecheck
```

**Step 2: Lint**

```bash
pnpm lint
```

**Step 3: Visual test**

Compare the redesigned page against the live console screenshot for each section:
- [ ] Info row matches (framework, version, size, dates)
- [ ] Default gateway URL is correct and clickable
- [ ] Alternative gateways template shown
- [ ] ENS gateways shows setup instructions
- [ ] Current version shows volume link, item hash, CID v0, CID v1
- [ ] Volume detail page shows website linkage

**Step 4: Commit any remaining fixes**
