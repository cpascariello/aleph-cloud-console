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
