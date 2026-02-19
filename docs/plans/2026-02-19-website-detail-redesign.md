# Website Detail Page Redesign

## Problem

The website detail page is missing significant information compared to the live console at aleph.cloud. Three issues:

1. **URL points to localhost** — `website.url` is set to a relative route `/storage/volume/{volume_id}`, which renders as `localhost:3000/...`
2. **Volume not showing as linked** — volume detail page linkage check may fail if websites query hasn't resolved
3. **Missing information** — no gateway URLs, IPFS CIDs, version info, volume link, ENS instructions

## Reference

The live console shows these sections:

- Header: name, framework, version, size, created on, updated on
- Default Gateway: `https://{cidV1}.ipfs.aleph.sh` with copy + open actions
- Alternative Gateways: template URL with `<gateway-hostname>` placeholder
- ENS Gateways: informational setup instructions with `ipfs://{cidV1}` content hash
- Current Version: version number, volume details link, item hash, IPFS CID v0, IPFS CID v1

## Changes

### SDK (packages/aleph-sdk)

1. Add `version`, `ens`, `created_at` fields to `WebsiteAggregateItem` and `Website` types
2. Parse these fields in `WebsiteManager.parseAggregateItem()`
3. Add `multiformats` dependency for CID v0 to v1 conversion
4. Add `cidV0toV1()` utility function

### Console (packages/console)

5. Redesign website detail page to match live console layout:
   - Info row: framework, version, size, created on, updated on
   - Default Gateway card with CIDv1-based URL
   - Alternative Gateways card with template URL
   - ENS Gateways card with setup instructions (informational only — ENS must be configured externally)
   - Current Version card: version number, volume link, item hash, CID v0, CID v1
6. Verify volume detail page linkage detection works correctly
