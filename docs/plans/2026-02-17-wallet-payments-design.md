# Phase 6: Wallet & Payments Design

## Overview

Integrate Reown AppKit for multi-chain wallet connection and build payment UI components for resource creation wizards. Two tasks: wallet connection (provider, hooks, navbar UI) and payment components (cost estimation, affordability check, checkout summary).

## Decisions

- **Wallet adapter**: ethers5 + Solana adapters (matches @aleph-sdk dependencies)
- **Connect UI**: Reown AppKit built-in modal (handles wallet detection, QR, deep links)
- **No vouchers**: NFT voucher support deferred to a later phase
- **Balance in payment layer**: Wallet context does NOT expose balance — balance depends on payment method, so it lives in `useCanAfford`

## Task 6.1: Wallet Connection

### wallet-provider.tsx

Initializes Reown AppKit at module scope (SSR-safe, `"use client"`) with:

- `Ethers5Adapter` for EVM chains (ETH, AVAX, BASE)
- `SolanaAdapter` for Solana
- Project ID from `NEXT_PUBLIC_WALLET_CONNECT_ID` env var
- Disabled features: analytics, swaps, onramp, send, receive, email, socials, pay
- Networks: mainnet, avalanche, base, solana (from `@reown/appkit/networks`)

Exposes `WalletContext`:

```typescript
type WalletState = {
  isConnected: boolean
  address: string | undefined
  chainId: number | string | undefined
  blockchainId: BlockchainId | undefined
  openModal: () => void
  disconnect: () => Promise<void>
  switchNetwork: (chainId: number) => Promise<void>
  getAlephAccount: () => Promise<Account | undefined>
}
```

Uses AppKit hooks internally (`useAppKitAccount`, `useAppKitNetwork`, `useAppKitProvider`) and maps chainId to `BlockchainId` using the SDK's `networks` lookup table.

### use-wallet.ts

One-liner hook: reads `WalletContext`, throws if used outside provider.

### wallet-button.tsx

Two visual states in the navbar:

**Disconnected:** Primary `Button` with wallet icon + "Connect Wallet". `onClick` calls `openModal()`.

**Connected:** Button group showing chain badge + truncated address. Click opens AppKit modal (chain switch, disconnect, account details). Address portion supports copy-to-clipboard.

### chain-badge.tsx

Takes `BlockchainId`, renders `Badge` with chain name. Variant mapping: ETH/BASE -> `info`, AVAX -> `error`, SOL -> `success`.

### Navbar integration

Replace placeholder wallet button in `console-navbar.tsx` with `<WalletButton />`. Component handles its own state via `useWallet()`.

### Provider wiring

Order in `providers/index.tsx`:

```
QueryProvider > WalletProvider > ManagersProvider > ThemeProvider > ToastProvider
```

ManagersProvider modified: remove `account` prop, internally call `useWallet()` to get `getAlephAccount()`, resolve account via `useEffect` + state, pass to `createManagers()`.

## Task 6.2: Payment Components

### Balance fetching (two-path system)

- **Hold** (all chains): `GET ${API_SERVER}/api/v0/addresses/${address}/balance` via pyaleph API. Returns 0 on 404.
- **Stream** (EVM only): `@aleph-sdk/superfluid` -> `createFromEVMAccount()` -> `getALEPHBalance()`. Not available on Solana.

### use-cost-estimate.ts

```typescript
useCostEstimate(params: {
  type: PriceType
  paymentMethod: PaymentMethod
  vcpus?: number
  memory?: number
  storage?: number
  gpuModel?: string
})
// Returns { costSummary: CostSummary, isLoading, error }
```

Fetches `PricingAggregate` via `CostManager.getPricesAggregate()` (React Query cached), computes cost lines from pricing data and resource params. Recalculates reactively as form values change.

### use-can-afford.ts

```typescript
useCanAfford(params: {
  cost: number | undefined
  paymentMethod: PaymentMethod
})
// Returns { canAfford, balance, required, deficit, isLoading }
```

Fetches balance via the two-path system above. Both paths use React Query with cache/refetch intervals.

### payment-method-toggle.tsx

Controlled `RadioGroup` with Hold and Stream options:

- **Hold**: "Lock ALEPH tokens for the duration of the resource. Tokens returned when resource is deleted."
- **Stream**: "Pay per second from your Superfluid balance. Only available on EVM chains."

Stream disabled with tooltip when connected to Solana. Standard controlled component for React Hook Form.

### cost-breakdown.tsx

Renders `CostSummary` as line-item list: each `CostLine` as name/detail/cost row, separator, bold total. Loading skeleton when `isLoading`. Costs displayed as ALEPH.

### checkout-summary.tsx

Composes payment-method-toggle + cost-breakdown + insufficient-funds-alert. Props: resource config from wizard form. Internally uses `useCostEstimate` and `useCanAfford`. Single drop-in component for wizard footers.

### insufficient-funds-alert.tsx

`Alert` (warning) showing current balance vs required, with link to acquire ALEPH. When disconnected, shows "Connect Wallet" action instead. Only renders when `canAfford: false`.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No env var | Dev warning, wallet button is no-op |
| Connection rejected | AppKit handles internally |
| Chain mismatch (Stream on Solana) | Alert in CheckoutSummary with "Switch to [chain]" button |
| Disconnect mid-wizard | InsufficientFundsAlert shows "Connect Wallet" action |
| Balance API unreachable | Alert with "Unable to check balance — retry" |
| Pricing fetch fails | CostBreakdown shows "Unable to load pricing" with retry |
| Superfluid balance fails | Falls back to 0, error toast |

All errors non-fatal. No silent swallowing.

## Testing

| Test file | Coverage |
|-----------|----------|
| `use-cost-estimate.test.ts` | Cost calculation for different configs/payment methods, zero resources, missing pricing |
| `use-can-afford.test.ts` | Hold/Stream balance, exact-equal edge, zero balance, disconnected |
| `payment-method-toggle.test.ts` | Both options render, Stream disabled on Solana |
| `cost-breakdown.test.ts` | Line items, loading skeleton, empty state |
| `insufficient-funds-alert.test.ts` | Shows when unaffordable, hidden when affordable, "Connect Wallet" when disconnected |
| `wallet-button.test.ts` | Disconnected/connected states, openModal on click |
| `chain-badge.test.ts` | Correct name/variant per BlockchainId |

No integration tests for Reown AppKit — mocked at hook boundary.

## Data Flow

```
WalletProvider (address, chainId, getAlephAccount)
  -> ManagersProvider (managers with resolved account)
    -> WizardPage
      -> useWizard() provides form state
      -> CheckoutSummary receives form values
        -> useCostEstimate(formValues) -> CostManager -> CostSummary
        -> useCanAfford(cost, paymentMethod) -> balance API -> canAfford
        -> PaymentMethodToggle (form-controlled)
        -> CostBreakdown (renders CostSummary)
        -> InsufficientFundsAlert (conditional)
```

## Dependencies to Install

```
@reown/appkit
@reown/appkit-adapter-ethers5
@reown/appkit-adapter-solana
```

## Environment Variables

```
NEXT_PUBLIC_WALLET_CONNECT_ID=<reown-project-id>
```
