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
import type { AppKitNetwork } from '@reown/appkit/networks'
import { mainnet, avalanche, base, solana } from '@reown/appkit/networks'
import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
  useAppKitProvider,
  useDisconnect,
} from '@reown/appkit/react'
import type { Account } from '@aleph-sdk/account'
import { getAccountFromProvider as getETHAccount } from '@aleph-sdk/ethereum'
import { getAccountFromProvider as getSOLAccount } from '@aleph-sdk/solana'
import { getAccountFromProvider as getAVAXAccount } from '@aleph-sdk/avalanche'
import { getAccountFromProvider as getBASEAccount } from '@aleph-sdk/base'
import {
  BlockchainId,
  networks as chainIdToBlockchain,
  isEip155Provider,
  isSolanaProvider,
} from 'aleph-sdk'

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

const projectId = process.env['NEXT_PUBLIC_WALLET_CONNECT_ID']

if (projectId) {
  const ethers5Adapter = new Ethers5Adapter()
  const solanaAdapter = new SolanaAdapter()

  createAppKit({
    adapters: [ethers5Adapter, solanaAdapter] as never,
    networks: [mainnet, avalanche, base, solana] as [
      AppKitNetwork,
      ...AppKitNetwork[],
    ],
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
      const networkMap: Record<number, AppKitNetwork> = {
        1: mainnet,
        43114: avalanche,
        8453: base,
        900: solana as AppKitNetwork,
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
