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
    <Badge variant={variant} {...(className && { className })}>
      {config?.name ?? blockchainId}
    </Badge>
  )
}
