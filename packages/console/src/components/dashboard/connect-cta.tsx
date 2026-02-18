'use client'

import {
  Button,
  SectionHeading,
  Text,
} from '@/components/data-terminal'
import { useWallet } from '@/providers/wallet-provider'

export function ConnectCTA() {
  const { openModal } = useWallet()

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <SectionHeading as="h3" cursor={false}>
        Ready to deploy?
      </SectionHeading>
      <Text className="max-w-md text-foreground/60">
        Connect your wallet to start deploying virtual machines,
        websites, and storage on the Aleph decentralized network.
      </Text>
      <Button variant="primary" onClick={openModal}>
        Connect Wallet
      </Button>
    </div>
  )
}
