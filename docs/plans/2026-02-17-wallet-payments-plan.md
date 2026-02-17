# Phase 6: Wallet & Payments Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Reown AppKit for multi-chain wallet connection and build payment UI components for resource creation wizards.

**Architecture:** Reown AppKit (ethers5 + Solana adapters) provides wallet connection. A `WalletProvider` wraps the app and feeds the connected account into `ManagersProvider`. Payment components use the SDK's `CostManager` for pricing and the pyaleph API for balance fetching. `CheckoutSummary` is a drop-in composite for wizard footers.

**Tech Stack:** Reown AppKit 1.x, @aleph-sdk/ethereum + avalanche + base + solana, TanStack React Query, data-terminal design system components

**Design doc:** `docs/plans/2026-02-17-wallet-payments-design.md`

---

## Task 1: Install Reown Dependencies

**Files:**
- Modify: `packages/console/package.json`

**Step 1: Install Reown packages**

Run:
```bash
pnpm --filter console add @reown/appkit@^1.7.18 @reown/appkit-adapter-ethers5@^1.7.18 @reown/appkit-adapter-solana@^1.7.18
```

**Step 2: Install Aleph SDK chain adapters**

The wallet provider needs chain-specific `getAccountFromProvider` functions. These live in separate packages:

Run:
```bash
pnpm --filter console add @aleph-sdk/ethereum@1.5.0 @aleph-sdk/avalanche@1.5.0 @aleph-sdk/base@1.5.0 @aleph-sdk/solana@1.6.2 @aleph-sdk/superfluid@1.4.5 @aleph-sdk/account@1.2.0
```

**Step 3: Add environment variable**

Create `.env.local` (if it doesn't exist) and add:

```
NEXT_PUBLIC_WALLET_CONNECT_ID=your_project_id_here
```

Verify `.env.local` is in `.gitignore`.

**Step 4: Verify install**

Run:
```bash
pnpm --filter console build
```
Expected: Builds without errors.

**Step 5: Commit**

```bash
git add packages/console/package.json pnpm-lock.yaml
git commit -m "feat: add Reown AppKit and chain adapter dependencies"
```

---

## Task 2: Add Provider Type Guards to SDK

The wallet provider needs type guards for EVM vs Solana providers. These belong in the SDK since they're domain logic.

**Files:**
- Create: `packages/aleph-sdk/src/types/provider.ts`
- Modify: `packages/aleph-sdk/src/types/index.ts`
- Modify: `packages/aleph-sdk/src/index.ts`

**Step 1: Create provider types**

Create `packages/aleph-sdk/src/types/provider.ts`:

```typescript
/**
 * EVM Provider (EIP-1193 compatible).
 * Used for Ethereum, Avalanche, and Base networks.
 */
export type Eip155Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

/**
 * Solana Provider.
 * Uses native Solana methods instead of EIP-1193.
 */
export type SolanaWalletProvider = {
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>
  signTransaction: (transaction: unknown) => Promise<unknown>
  publicKey?: unknown
}

export type MultiChainProvider = Eip155Provider | SolanaWalletProvider

export function isEip155Provider(
  provider: unknown,
): provider is Eip155Provider {
  return (
    typeof provider === 'object' &&
    provider !== null &&
    'request' in provider &&
    typeof (provider as Record<string, unknown>).request === 'function'
  )
}

export function isSolanaProvider(
  provider: unknown,
): provider is SolanaWalletProvider {
  return (
    typeof provider === 'object' &&
    provider !== null &&
    'signMessage' in provider &&
    typeof (provider as Record<string, unknown>).signMessage === 'function'
  )
}
```

**Step 2: Export from types/index.ts**

Add to `packages/aleph-sdk/src/types/index.ts`:

```typescript
export type {
  Eip155Provider,
  SolanaWalletProvider,
  MultiChainProvider,
} from '@/types/provider'
export { isEip155Provider, isSolanaProvider } from '@/types/provider'
```

**Step 3: Export from root index.ts**

Add to `packages/aleph-sdk/src/index.ts` in the appropriate sections:

In the type exports:
```typescript
export type {
  Eip155Provider,
  SolanaWalletProvider,
  MultiChainProvider,
} from '@/types/provider'
```

In the value exports:
```typescript
export { isEip155Provider, isSolanaProvider } from '@/types/provider'
```

**Step 4: Verify**

Run:
```bash
pnpm --filter aleph-sdk typecheck
```
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/aleph-sdk/src/types/provider.ts packages/aleph-sdk/src/types/index.ts packages/aleph-sdk/src/index.ts
git commit -m "feat: add provider type guards for multi-chain wallet support"
```

---

## Task 3: Add Balance Fetching to SDK

**Files:**
- Create: `packages/aleph-sdk/src/managers/balance.ts`
- Modify: `packages/aleph-sdk/src/managers/factory.ts`
- Modify: `packages/aleph-sdk/src/index.ts`
- Test: `packages/aleph-sdk/src/managers/balance.test.ts`

**Step 1: Write the failing test**

Create `packages/aleph-sdk/src/managers/balance.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BalanceManager } from './balance'
import { PaymentMethod } from '@/constants'

describe('BalanceManager', () => {
  let manager: BalanceManager

  beforeEach(() => {
    manager = new BalanceManager('https://api.aleph.im')
    vi.restoreAllMocks()
  })

  describe('getHoldBalance', () => {
    it('returns balance from API', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ balance: 1500.5 }), { status: 200 }),
      )

      const balance = await manager.getHoldBalance('0xabc123')
      expect(balance).toBe(1500.5)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.aleph.im/api/v0/addresses/0xabc123/balance',
      )
    })

    it('returns 0 on 404', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('', { status: 404 }),
      )

      const balance = await manager.getHoldBalance('0xunknown')
      expect(balance).toBe(0)
    })

    it('throws on network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new Error('Network error'),
      )

      await expect(manager.getHoldBalance('0xabc')).rejects.toThrow()
    })
  })

  describe('getBalance', () => {
    it('delegates to getHoldBalance for Hold payment', async () => {
      vi.spyOn(manager, 'getHoldBalance').mockResolvedValueOnce(1000)

      const balance = await manager.getBalance('0xabc', PaymentMethod.Hold)
      expect(balance).toBe(1000)
      expect(manager.getHoldBalance).toHaveBeenCalledWith('0xabc')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm --filter aleph-sdk test -- src/managers/balance.test.ts
```
Expected: FAIL — `BalanceManager` not found.

**Step 3: Implement BalanceManager**

Create `packages/aleph-sdk/src/managers/balance.ts`:

```typescript
import { PaymentMethod } from '@/constants'

export class BalanceManager {
  constructor(private apiServer: string) {}

  /**
   * Fetch ALEPH hold balance from the pyaleph API.
   * Works for all chains (ETH, AVAX, BASE, SOL).
   */
  async getHoldBalance(address: string): Promise<number> {
    const response = await fetch(
      `${this.apiServer}/api/v0/addresses/${address}/balance`,
    )

    if (response.status === 404) return 0

    if (!response.ok) {
      throw new Error(
        `Failed to fetch balance: ${response.status} ${response.statusText}`,
      )
    }

    const data: { balance: number } = await response.json()
    return data.balance
  }

  /**
   * Fetch ALEPH balance for the given payment method.
   * Hold: uses pyaleph API (all chains).
   * Stream: TODO — requires Superfluid account, handled at app layer for now.
   */
  async getBalance(
    address: string,
    paymentMethod: PaymentMethod,
  ): Promise<number> {
    if (paymentMethod === PaymentMethod.Stream) {
      // Stream balance requires a Superfluid account object,
      // which is created from the wallet provider at the app layer.
      // For now, only Hold balance is supported at the SDK level.
      // The console's useCanAfford hook handles Stream balance directly.
      return this.getHoldBalance(address)
    }

    return this.getHoldBalance(address)
  }
}
```

**Step 4: Wire into factory**

Modify `packages/aleph-sdk/src/managers/factory.ts`:

Add import:
```typescript
import { BalanceManager } from '@/managers/balance'
```

Add to `AlephManagers` interface:
```typescript
balanceManager: BalanceManager
```

Add to `createManagers` function body (after `const apiUrl`):
```typescript
const balanceManager = new BalanceManager(apiUrl)
```

Add `balanceManager` to the returned object.

**Step 5: Export from index.ts**

Add to `packages/aleph-sdk/src/index.ts`:
```typescript
export { BalanceManager } from '@/managers/balance'
```

**Step 6: Run tests**

Run:
```bash
pnpm --filter aleph-sdk test -- src/managers/balance.test.ts
```
Expected: All 3 tests PASS.

**Step 7: Type check**

Run:
```bash
pnpm --filter aleph-sdk typecheck
```
Expected: No errors.

**Step 8: Commit**

```bash
git add packages/aleph-sdk/src/managers/balance.ts packages/aleph-sdk/src/managers/balance.test.ts packages/aleph-sdk/src/managers/factory.ts packages/aleph-sdk/src/index.ts
git commit -m "feat: add BalanceManager for ALEPH balance fetching"
```

---

## Task 4: Create Wallet Provider

**Files:**
- Create: `packages/console/src/providers/wallet-provider.tsx`
- Modify: `packages/console/src/providers/index.tsx`
- Modify: `packages/console/src/providers/managers-provider.tsx`

**Step 1: Create wallet-provider.tsx**

Create `packages/console/src/providers/wallet-provider.tsx`:

```typescript
'use client'

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from 'react'
import { createAppKit } from '@reown/appkit/react'
import { Ethers5Adapter } from '@reown/appkit-adapter-ethers5'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { mainnet, avalanche, base, solana } from '@reown/appkit/networks'
import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
  useAppKitProvider,
  useDisconnect,
} from '@reown/appkit/react'
import type { Account } from '@aleph-sdk/account'
import { Blockchain as BlockchainId } from '@aleph-sdk/core'
import { getAccountFromProvider as getETHAccount } from '@aleph-sdk/ethereum'
import { getAccountFromProvider as getSOLAccount } from '@aleph-sdk/solana'
import { getAccountFromProvider as getAVAXAccount } from '@aleph-sdk/avalanche'
import { getAccountFromProvider as getBASEAccount } from '@aleph-sdk/base'
import { networks as chainIdToBlockchain } from 'aleph-sdk'
import { isEip155Provider, isSolanaProvider } from 'aleph-sdk'

export type WalletState = {
  isConnected: boolean
  address: string | undefined
  chainId: number | string | undefined
  blockchainId: BlockchainId | undefined
  openModal: () => void
  disconnect: () => Promise<void>
  switchNetwork: (chainId: number) => Promise<void>
  getAlephAccount: () => Promise<Account | undefined>
}

const WalletContext = createContext<WalletState | null>(null)

// --- AppKit initialization (runs once at module load) ---

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID

if (projectId) {
  const ethers5Adapter = new Ethers5Adapter()
  const solanaAdapter = new SolanaAdapter()

  createAppKit({
    adapters: [ethers5Adapter, solanaAdapter],
    networks: [mainnet, avalanche, base, solana],
    projectId,
    metadata: {
      name: 'Aleph Cloud',
      description: 'Aleph Cloud: Web3 cloud solution',
      url: 'https://console.aleph.cloud',
      icons: ['https://account.aleph.im/favicon-32x32.png'],
    },
    features: {
      analytics: false,
      swaps: false,
      onramp: false,
      receive: false,
      send: false,
      email: false,
      socials: false,
      pay: false,
    },
    allowUnsupportedChain: true,
  })
} else if (typeof window !== 'undefined') {
  console.warn(
    'NEXT_PUBLIC_WALLET_CONNECT_ID is not set. Wallet connection will be unavailable.',
  )
}

// --- Chain ID mapping ---

function resolveBlockchainId(
  chainId: number | string | undefined,
): BlockchainId | undefined {
  if (chainId === undefined) return undefined

  if (typeof chainId === 'string') {
    if (
      chainId.toLowerCase().includes('solana') ||
      chainId === '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
    ) {
      return BlockchainId.SOL
    }
    const parsed = parseInt(chainId, 10)
    if (!isNaN(parsed)) return chainIdToBlockchain[parsed]?.id
    return undefined
  }

  return chainIdToBlockchain[chainId]?.id
}

// --- Provider component ---

export function WalletProvider({ children }: { children: ReactNode }) {
  const appKit = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { chainId, switchNetwork: reownSwitchNetwork } = useAppKitNetwork()
  const { disconnect } = useDisconnect()
  const { walletProvider: eip155Provider } = useAppKitProvider('eip155')
  const { walletProvider: solanaProvider } = useAppKitProvider('solana')

  const blockchainId = resolveBlockchainId(chainId)

  const getAlephAccount = useCallback(async (): Promise<
    Account | undefined
  > => {
    if (!isConnected || !blockchainId) return undefined

    const provider =
      blockchainId === BlockchainId.SOL ? solanaProvider : eip155Provider
    if (!provider) return undefined

    switch (blockchainId) {
      case BlockchainId.ETH: {
        if (!isEip155Provider(provider)) return undefined
        return getETHAccount(provider as never)
      }
      case BlockchainId.AVAX: {
        if (!isEip155Provider(provider)) return undefined
        return getAVAXAccount(provider as never)
      }
      case BlockchainId.BASE: {
        if (!isEip155Provider(provider)) return undefined
        return getBASEAccount(provider as never)
      }
      case BlockchainId.SOL: {
        if (!isSolanaProvider(provider)) return undefined
        return getSOLAccount(provider as never)
      }
      default:
        return undefined
    }
  }, [isConnected, blockchainId, eip155Provider, solanaProvider])

  const handleSwitchNetwork = useCallback(
    async (targetChainId: number) => {
      const networkMap: Record<number, typeof mainnet> = {
        1: mainnet,
        43114: avalanche,
        8453: base,
        900: solana,
      }
      const network = networkMap[targetChainId]
      if (!network) throw new Error(`Unsupported chain ID: ${targetChainId}`)
      await reownSwitchNetwork(network)
    },
    [reownSwitchNetwork],
  )

  const handleDisconnect = useCallback(async () => {
    await disconnect()
    await appKit.close()
  }, [disconnect, appKit])

  const handleOpenModal = useCallback(() => {
    const namespace = blockchainId === BlockchainId.SOL ? 'solana' : 'eip155'
    appKit.open({ view: 'Connect', namespace })
  }, [appKit, blockchainId])

  const value: WalletState = {
    isConnected,
    address,
    chainId,
    blockchainId,
    openModal: handleOpenModal,
    disconnect: handleDisconnect,
    switchNetwork: handleSwitchNetwork,
    getAlephAccount,
  }

  return <WalletContext value={value}>{children}</WalletContext>
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return ctx
}
```

**Step 2: Update managers-provider.tsx**

Replace `packages/console/src/providers/managers-provider.tsx` with:

```typescript
'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createManagers, type AlephManagers, type Account } from 'aleph-sdk'
import { useWallet } from '@/providers/wallet-provider'

const ManagersContext = createContext<AlephManagers | null>(null)

export function ManagersProvider({ children }: { children: ReactNode }) {
  const { isConnected, getAlephAccount } = useWallet()
  const [account, setAccount] = useState<Account | undefined>()

  useEffect(() => {
    if (!isConnected) {
      setAccount(undefined)
      return
    }

    let cancelled = false
    getAlephAccount().then((acc) => {
      if (!cancelled) setAccount(acc)
    })

    return () => {
      cancelled = true
    }
  }, [isConnected, getAlephAccount])

  const managers = useMemo(() => createManagers(account), [account])

  return <ManagersContext value={managers}>{children}</ManagersContext>
}

export function useManagers(): AlephManagers {
  const ctx = useContext(ManagersContext)
  if (!ctx) {
    throw new Error('useManagers must be used within ManagersProvider')
  }
  return ctx
}
```

**Step 3: Update providers/index.tsx**

Replace `packages/console/src/providers/index.tsx` with:

```typescript
'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from '@/providers/theme-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { QueryProvider } from '@/providers/query-provider'
import { WalletProvider } from '@/providers/wallet-provider'
import { ManagersProvider } from '@/providers/managers-provider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <WalletProvider>
        <ManagersProvider>
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </ManagersProvider>
      </WalletProvider>
    </QueryProvider>
  )
}
```

**Step 4: Type check**

Run:
```bash
pnpm typecheck
```
Expected: No errors. (If Reown types have issues with React 19, we may need to add type overrides — address if needed.)

**Step 5: Commit**

```bash
git add packages/console/src/providers/wallet-provider.tsx packages/console/src/providers/managers-provider.tsx packages/console/src/providers/index.tsx
git commit -m "feat: add WalletProvider with Reown AppKit integration"
```

---

## Task 5: Create Wallet UI Components

**Files:**
- Create: `packages/console/src/components/wallet/chain-badge.tsx`
- Create: `packages/console/src/components/wallet/wallet-button.tsx`
- Modify: `packages/console/src/components/shell/console-navbar.tsx`

**Step 1: Create chain-badge.tsx**

Create `packages/console/src/components/wallet/chain-badge.tsx`:

```typescript
import { Badge } from '@/components/data-terminal'
import { BlockchainId, blockchains } from 'aleph-sdk'

const variantMap: Record<string, 'info' | 'success' | 'error' | 'neutral'> = {
  [BlockchainId.ETH]: 'info',
  [BlockchainId.AVAX]: 'error',
  [BlockchainId.BASE]: 'info',
  [BlockchainId.SOL]: 'success',
}

export function ChainBadge({
  blockchainId,
  className,
}: {
  blockchainId: BlockchainId
  className?: string
}) {
  const config = blockchains[blockchainId]
  const variant = variantMap[blockchainId] ?? 'neutral'

  return (
    <Badge variant={variant} className={className}>
      {config?.name ?? blockchainId}
    </Badge>
  )
}
```

**Step 2: Create wallet-button.tsx**

Create `packages/console/src/components/wallet/wallet-button.tsx`:

```typescript
'use client'

import { Wallet } from 'lucide-react'
import { Button } from '@/components/data-terminal'
import { ChainBadge } from '@/components/wallet/chain-badge'
import { useWallet } from '@/providers/wallet-provider'

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function WalletButton() {
  const { isConnected, address, blockchainId, openModal } = useWallet()

  if (!isConnected || !address) {
    return (
      <Button variant="primary" size="sm" onClick={openModal}>
        <Wallet size={16} />
        Connect Wallet
      </Button>
    )
  }

  return (
    <button
      type="button"
      onClick={openModal}
      className="flex items-center gap-2 rounded border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary hover:bg-muted"
    >
      {blockchainId && <ChainBadge blockchainId={blockchainId} />}
      <span className="font-mono text-xs text-foreground">
        {truncateAddress(address)}
      </span>
    </button>
  )
}
```

**Step 3: Update console-navbar.tsx**

Replace `packages/console/src/components/shell/console-navbar.tsx` with:

```typescript
'use client'

import { Search, Bell } from 'lucide-react'
import { Button } from '@/components/data-terminal'
import { WalletButton } from '@/components/wallet/wallet-button'

interface ConsoleNavbarProps {
  onOpenCommandPalette?: () => void
}

export function ConsoleNavbar({ onOpenCommandPalette }: ConsoleNavbarProps) {
  return (
    <nav
      aria-label="Top navigation"
      className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-4 py-2 backdrop-blur-md"
    >
      <Button variant="ghost" size="sm" onClick={onOpenCommandPalette}>
        <Search size={16} />
        <span className="ml-2 text-xs text-muted-foreground">
          Search... <kbd className="ml-1 opacity-50">⌘K</kbd>
        </span>
      </Button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
        <WalletButton />
      </div>
    </nav>
  )
}
```

**Step 4: Type check**

Run:
```bash
pnpm typecheck
```
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/console/src/components/wallet/chain-badge.tsx packages/console/src/components/wallet/wallet-button.tsx packages/console/src/components/shell/console-navbar.tsx
git commit -m "feat: add wallet button and chain badge to navbar"
```

---

## Task 6: Create Payment Hooks

**Files:**
- Create: `packages/console/src/hooks/queries/use-pricing.ts`
- Create: `packages/console/src/hooks/use-cost-estimate.ts`
- Create: `packages/console/src/hooks/use-can-afford.ts`
- Test: `packages/console/src/hooks/use-cost-estimate.test.ts`
- Test: `packages/console/src/hooks/use-can-afford.test.ts`

**Step 1: Create pricing query hook**

Create `packages/console/src/hooks/queries/use-pricing.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import type { PricingAggregate } from 'aleph-sdk'

export const pricingKeys = {
  all: ['pricing'] as const,
}

export function usePricing() {
  const { costManager } = useManagers()

  return useQuery<PricingAggregate>({
    queryKey: pricingKeys.all,
    queryFn: () => costManager.getPricesAggregate(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}
```

**Step 2: Write failing test for useCostEstimate**

Create `packages/console/src/hooks/use-cost-estimate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeCostLines } from './use-cost-estimate'
import { PaymentMethod, PriceType } from 'aleph-sdk'
import type { PricingAggregate, PriceTypeObject } from 'aleph-sdk'

const mockPriceObject: PriceTypeObject = {
  price: {
    storage: { payg: '0.000000001', holding: '0.01' },
    computeUnit: { payg: '0.0001', holding: '1.5' },
  },
  tiers: [],
  computeUnit: { vcpus: 1, diskMib: 2048, memoryMib: 2048 },
}

const mockPricing: PricingAggregate = {
  [PriceType.Instance]: mockPriceObject,
  [PriceType.InstanceConfidential]: mockPriceObject,
  [PriceType.InstanceGpuPremium]: mockPriceObject,
  [PriceType.InstanceGpuStandard]: mockPriceObject,
  [PriceType.Program]: mockPriceObject,
  [PriceType.ProgramPersistent]: mockPriceObject,
  [PriceType.Storage]: mockPriceObject,
  [PriceType.Web3Hosting]: mockPriceObject,
}

describe('computeCostLines', () => {
  it('computes hold cost for an instance', () => {
    const result = computeCostLines({
      pricing: mockPricing,
      type: PriceType.Instance,
      paymentMethod: PaymentMethod.Hold,
      vcpus: 2,
      memory: 4096,
      storage: 10240,
    })

    expect(result.paymentMethod).toBe(PaymentMethod.Hold)
    expect(result.lines.length).toBeGreaterThan(0)
    expect(result.cost).toBeGreaterThan(0)
  })

  it('computes stream cost for an instance', () => {
    const result = computeCostLines({
      pricing: mockPricing,
      type: PriceType.Instance,
      paymentMethod: PaymentMethod.Stream,
      vcpus: 1,
      memory: 2048,
      storage: 2048,
    })

    expect(result.paymentMethod).toBe(PaymentMethod.Stream)
    expect(result.cost).toBeGreaterThan(0)
  })

  it('returns zero cost for zero resources', () => {
    const result = computeCostLines({
      pricing: mockPricing,
      type: PriceType.Instance,
      paymentMethod: PaymentMethod.Hold,
      vcpus: 0,
      memory: 0,
      storage: 0,
    })

    expect(result.cost).toBe(0)
  })

  it('computes storage-only cost', () => {
    const result = computeCostLines({
      pricing: mockPricing,
      type: PriceType.Storage,
      paymentMethod: PaymentMethod.Hold,
      storage: 1048576,
    })

    expect(result.lines.some((l) => l.name === 'Storage')).toBe(true)
    expect(result.cost).toBeGreaterThan(0)
  })
})
```

**Step 3: Run test to verify it fails**

Run:
```bash
pnpm --filter console test -- src/hooks/use-cost-estimate.test.ts
```
Expected: FAIL — `computeCostLines` not found.

**Step 4: Implement useCostEstimate**

Create `packages/console/src/hooks/use-cost-estimate.ts`:

```typescript
import { useMemo } from 'react'
import { usePricing } from '@/hooks/queries/use-pricing'
import {
  PaymentMethod,
  PriceType,
  type CostLine,
  type CostSummary,
  type PricingAggregate,
} from 'aleph-sdk'

export type CostEstimateParams = {
  type: PriceType
  paymentMethod: PaymentMethod
  vcpus?: number
  memory?: number
  storage?: number
  gpuModel?: string
}

/**
 * Compute cost lines from pricing data and resource parameters.
 * Exported for testing — the hook wraps this with React Query.
 */
export function computeCostLines(
  params: CostEstimateParams & { pricing: PricingAggregate },
): CostSummary {
  const { pricing, type, paymentMethod, vcpus = 0, memory = 0, storage = 0 } = params
  const priceObj = pricing[type]
  if (!priceObj) {
    return { paymentMethod, cost: 0, lines: [] }
  }

  const isPayg = paymentMethod === PaymentMethod.Stream
  const computeUnitPrice = parseFloat(
    isPayg ? priceObj.price.computeUnit.payg : priceObj.price.computeUnit.holding,
  )
  const storageUnitPrice = parseFloat(
    isPayg ? priceObj.price.storage.payg : priceObj.price.storage.holding,
  )

  const lines: CostLine[] = []

  // Compute cost: how many compute units does the config require?
  if (vcpus > 0 || memory > 0) {
    const cu = priceObj.computeUnit
    const vcpuUnits = cu.vcpus > 0 ? vcpus / cu.vcpus : 0
    const memUnits = cu.memoryMib > 0 ? memory / cu.memoryMib : 0
    const computeUnits = Math.max(vcpuUnits, memUnits)
    const computeCost = computeUnits * computeUnitPrice

    if (computeCost > 0) {
      lines.push({
        id: 'compute',
        name: 'Compute',
        detail: `${vcpus} vCPU, ${memory} MiB RAM`,
        cost: computeCost,
      })
    }
  }

  // Storage cost
  if (storage > 0) {
    const storageMb = storage
    const storageCost = storageMb * storageUnitPrice

    if (storageCost > 0) {
      lines.push({
        id: 'storage',
        name: 'Storage',
        detail: `${storageMb} MiB`,
        cost: storageCost,
      })
    }
  }

  const totalCost = lines.reduce((sum, line) => sum + line.cost, 0)

  return {
    paymentMethod,
    cost: totalCost,
    lines,
  }
}

export function useCostEstimate(params: CostEstimateParams) {
  const { data: pricing, isLoading, error } = usePricing()

  const costSummary = useMemo(() => {
    if (!pricing) return undefined
    return computeCostLines({ ...params, pricing })
  }, [pricing, params.type, params.paymentMethod, params.vcpus, params.memory, params.storage, params.gpuModel])

  return { costSummary, isLoading, error }
}
```

**Step 5: Run cost estimate tests**

Run:
```bash
pnpm --filter console test -- src/hooks/use-cost-estimate.test.ts
```
Expected: All 4 tests PASS.

**Step 6: Write failing test for useCanAfford**

Create `packages/console/src/hooks/use-can-afford.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeAffordability } from './use-can-afford'

describe('computeAffordability', () => {
  it('returns canAfford true when balance exceeds cost', () => {
    const result = computeAffordability(1000, 500)
    expect(result.canAfford).toBe(true)
    expect(result.deficit).toBe(0)
  })

  it('returns canAfford false when balance is below cost', () => {
    const result = computeAffordability(100, 500)
    expect(result.canAfford).toBe(false)
    expect(result.deficit).toBe(400)
  })

  it('returns canAfford true when balance equals cost', () => {
    const result = computeAffordability(500, 500)
    expect(result.canAfford).toBe(true)
    expect(result.deficit).toBe(0)
  })

  it('returns canAfford false when balance is zero', () => {
    const result = computeAffordability(0, 100)
    expect(result.canAfford).toBe(false)
    expect(result.deficit).toBe(100)
  })

  it('returns canAfford true when cost is undefined', () => {
    const result = computeAffordability(1000, undefined)
    expect(result.canAfford).toBe(true)
    expect(result.deficit).toBe(0)
  })
})
```

**Step 7: Run test to verify it fails**

Run:
```bash
pnpm --filter console test -- src/hooks/use-can-afford.test.ts
```
Expected: FAIL — `computeAffordability` not found.

**Step 8: Implement useCanAfford**

Create `packages/console/src/hooks/use-can-afford.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { useManagers } from '@/hooks/use-managers'
import { useWallet } from '@/providers/wallet-provider'
import { PaymentMethod } from 'aleph-sdk'

export type AffordabilityResult = {
  canAfford: boolean
  balance: number
  required: number
  deficit: number
}

/**
 * Pure computation — exported for testing.
 */
export function computeAffordability(
  balance: number,
  cost: number | undefined,
): AffordabilityResult {
  const required = cost ?? 0
  const deficit = Math.max(0, required - balance)

  return {
    canAfford: balance >= required,
    balance,
    required,
    deficit,
  }
}

export const balanceKeys = {
  hold: (address: string) => ['balance', 'hold', address] as const,
}

export function useCanAfford(params: {
  cost: number | undefined
  paymentMethod: PaymentMethod
}) {
  const { address, isConnected } = useWallet()
  const { balanceManager } = useManagers()

  const {
    data: balance,
    isLoading,
    error,
  } = useQuery<number>({
    queryKey: balanceKeys.hold(address ?? ''),
    queryFn: () => balanceManager.getHoldBalance(address!),
    enabled: isConnected && Boolean(address),
    refetchInterval: 30_000,
    staleTime: 10_000,
  })

  const affordability = computeAffordability(balance ?? 0, params.cost)

  return {
    ...affordability,
    isLoading,
    error,
  }
}
```

**Step 9: Run affordability tests**

Run:
```bash
pnpm --filter console test -- src/hooks/use-can-afford.test.ts
```
Expected: All 5 tests PASS.

**Step 10: Type check**

Run:
```bash
pnpm typecheck
```
Expected: No errors.

**Step 11: Commit**

```bash
git add packages/console/src/hooks/queries/use-pricing.ts packages/console/src/hooks/use-cost-estimate.ts packages/console/src/hooks/use-cost-estimate.test.ts packages/console/src/hooks/use-can-afford.ts packages/console/src/hooks/use-can-afford.test.ts
git commit -m "feat: add cost estimation and affordability hooks"
```

---

## Task 7: Create Payment UI Components

**Files:**
- Create: `packages/console/src/components/payment/payment-method-toggle.tsx`
- Create: `packages/console/src/components/payment/cost-breakdown.tsx`
- Create: `packages/console/src/components/payment/insufficient-funds-alert.tsx`
- Create: `packages/console/src/components/payment/checkout-summary.tsx`

**Step 1: Create payment-method-toggle.tsx**

Create `packages/console/src/components/payment/payment-method-toggle.tsx`:

```typescript
import { RadioGroup, Tooltip } from '@/components/data-terminal'
import { PaymentMethod } from 'aleph-sdk'

const paymentOptions = [
  {
    value: PaymentMethod.Hold,
    label: 'Hold — Lock ALEPH tokens. Returned when resource is deleted.',
  },
  {
    value: PaymentMethod.Stream,
    label: 'Stream — Pay per second via Superfluid. EVM chains only.',
  },
]

export function PaymentMethodToggle({
  value,
  onChange,
  streamDisabled = false,
  className,
}: {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
  streamDisabled?: boolean
  className?: string
}) {
  const options = paymentOptions.map((opt) => ({
    ...opt,
    ...(opt.value === PaymentMethod.Stream && streamDisabled
      ? { label: `${opt.label} (Unavailable on this chain)` }
      : {}),
  }))

  return (
    <div className={className}>
      <RadioGroup
        label="Payment Method"
        options={options}
        value={value}
        onChange={(val) => onChange(val as PaymentMethod)}
        disabled={streamDisabled && value !== PaymentMethod.Hold}
      />
    </div>
  )
}
```

**Step 2: Create cost-breakdown.tsx**

Create `packages/console/src/components/payment/cost-breakdown.tsx`:

```typescript
import { Skeleton } from '@/components/data-terminal'
import type { CostSummary } from 'aleph-sdk'
import { round } from 'aleph-sdk'

export function CostBreakdown({
  costSummary,
  isLoading,
  className,
}: {
  costSummary: CostSummary | undefined
  isLoading: boolean
  className?: string
}) {
  if (isLoading) {
    return (
      <div className={className}>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-4 w-48 mb-1" />
        <Skeleton className="h-4 w-48 mb-1" />
        <Skeleton className="h-5 w-40 mt-2" />
      </div>
    )
  }

  if (!costSummary || costSummary.lines.length === 0) {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground">
          Configure resources to see cost estimate.
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Cost Estimate
      </h4>
      <div className="space-y-1">
        {costSummary.lines.map((line) => (
          <div key={line.id} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {line.name}
              {line.detail && (
                <span className="ml-1 text-xs opacity-60">({line.detail})</span>
              )}
            </span>
            <span className="font-mono">{round(line.cost, 4)} ALEPH</span>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-border pt-2">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>Total</span>
          <span className="font-mono">{round(costSummary.cost, 4)} ALEPH</span>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Create insufficient-funds-alert.tsx**

Create `packages/console/src/components/payment/insufficient-funds-alert.tsx`:

```typescript
import { Alert, Button } from '@/components/data-terminal'
import { round } from 'aleph-sdk'
import { useWallet } from '@/providers/wallet-provider'

export function InsufficientFundsAlert({
  balance,
  required,
  className,
}: {
  balance: number
  required: number
  className?: string
}) {
  const { isConnected, openModal } = useWallet()

  if (!isConnected) {
    return (
      <Alert variant="warning" className={className}>
        <div className="flex items-center justify-between gap-4">
          <span>Connect your wallet to check balance and deploy resources.</span>
          <Button variant="primary" size="sm" onClick={openModal}>
            Connect Wallet
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <Alert variant="warning" className={className}>
      <div className="space-y-1">
        <p className="font-medium">Insufficient ALEPH balance</p>
        <p className="text-sm">
          You have <span className="font-mono">{round(balance, 2)} ALEPH</span> but
          need <span className="font-mono">{round(required, 2)} ALEPH</span>.
        </p>
        <a
          href="https://www.aleph.cloud/token"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-primary underline hover:text-primary/80"
        >
          Acquire ALEPH tokens
        </a>
      </div>
    </Alert>
  )
}
```

**Step 4: Create checkout-summary.tsx**

Create `packages/console/src/components/payment/checkout-summary.tsx`:

```typescript
'use client'

import { PaymentMethodToggle } from '@/components/payment/payment-method-toggle'
import { CostBreakdown } from '@/components/payment/cost-breakdown'
import { InsufficientFundsAlert } from '@/components/payment/insufficient-funds-alert'
import { useCostEstimate, type CostEstimateParams } from '@/hooks/use-cost-estimate'
import { useCanAfford } from '@/hooks/use-can-afford'
import { useWallet } from '@/providers/wallet-provider'
import { PaymentMethod, isBlockchainPAYGCompatible } from 'aleph-sdk'

export function CheckoutSummary({
  type,
  paymentMethod,
  onPaymentMethodChange,
  vcpus,
  memory,
  storage,
  gpuModel,
  className,
}: CostEstimateParams & {
  onPaymentMethodChange: (method: PaymentMethod) => void
  className?: string
}) {
  const { blockchainId } = useWallet()
  const streamDisabled = !isBlockchainPAYGCompatible(blockchainId)

  const { costSummary, isLoading: costLoading } = useCostEstimate({
    type,
    paymentMethod,
    vcpus,
    memory,
    storage,
    gpuModel,
  })

  const { canAfford, balance, required, isLoading: balanceLoading } =
    useCanAfford({
      cost: costSummary?.cost,
      paymentMethod,
    })

  return (
    <div className={className}>
      <PaymentMethodToggle
        value={paymentMethod}
        onChange={onPaymentMethodChange}
        streamDisabled={streamDisabled}
        className="mb-4"
      />

      <CostBreakdown
        costSummary={costSummary}
        isLoading={costLoading}
        className="mb-4"
      />

      {!balanceLoading && !canAfford && (
        <InsufficientFundsAlert
          balance={balance}
          required={required}
        />
      )}
    </div>
  )
}
```

**Step 5: Type check**

Run:
```bash
pnpm typecheck
```
Expected: No errors.

**Step 6: Commit**

```bash
git add packages/console/src/components/payment/payment-method-toggle.tsx packages/console/src/components/payment/cost-breakdown.tsx packages/console/src/components/payment/insufficient-funds-alert.tsx packages/console/src/components/payment/checkout-summary.tsx
git commit -m "feat: build payment components and cost estimation"
```

---

## Task 8: Verify Full Build

**Step 1: Run all tests**

Run:
```bash
pnpm test
```
Expected: All tests pass.

**Step 2: Run full build**

Run:
```bash
pnpm build
```
Expected: Build succeeds.

**Step 3: Run linter**

Run:
```bash
pnpm lint
```
Expected: No errors.

**Step 4: Manual smoke test**

Run:
```bash
pnpm dev
```

Verify:
1. Console loads at localhost:3000 without errors
2. Navbar shows "Connect Wallet" button (or wallet connection UI if env var is set)
3. No console errors related to Reown or wallet

---

## Task 9: Update Documentation

**Files:**
- Modify: `docs/ARCHITECTURE.md` — add wallet provider and payment component patterns
- Modify: `CLAUDE.md` — update Current Features list

**Step 1: Update ARCHITECTURE.md**

Add a new section for wallet and payment patterns:

- Provider order diagram (Query > Wallet > Managers > Theme > Toast)
- Wallet state flow (AppKit → WalletProvider → useWallet → components)
- Payment data flow (useWizard form → CheckoutSummary → useCostEstimate + useCanAfford)
- BalanceManager API pattern (pyaleph API for Hold, Superfluid for Stream)

**Step 2: Update CLAUDE.md Current Features**

Add to the features list:
- Wallet connection: Reown AppKit integration, multi-chain (ETH, AVAX, BASE, SOL), navbar wallet button with chain badge
- Payment components: payment method toggle (Hold/Stream), cost breakdown, insufficient funds alert, checkout summary composite

**Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md CLAUDE.md
git commit -m "docs: update architecture and features for wallet & payments"
```
