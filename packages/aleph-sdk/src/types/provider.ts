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
    typeof (provider as Record<string, unknown>)['request'] === 'function'
  )
}

export function isSolanaProvider(
  provider: unknown,
): provider is SolanaWalletProvider {
  return (
    typeof provider === 'object' &&
    provider !== null &&
    'signMessage' in provider &&
    typeof (provider as Record<string, unknown>)['signMessage'] === 'function'
  )
}
