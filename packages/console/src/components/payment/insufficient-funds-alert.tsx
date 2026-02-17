'use client'

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
  const classNameProp = className !== undefined ? { className } : {}

  if (!isConnected) {
    return (
      <Alert variant="warning" {...classNameProp}>
        <div className="flex items-center justify-between gap-4">
          <span>
            Connect your wallet to check balance and deploy resources.
          </span>
          <Button variant="primary" size="sm" onClick={openModal}>
            Connect Wallet
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <Alert variant="warning" {...classNameProp}>
      <div className="space-y-1">
        <p className="font-medium">Insufficient ALEPH balance</p>
        <p className="text-sm">
          You have{' '}
          <span className="font-mono">{round(balance, 2)} ALEPH</span> but
          need{' '}
          <span className="font-mono">{round(required, 2)} ALEPH</span>.
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
