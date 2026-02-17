'use client'

import { PaymentMethodToggle } from '@/components/payment/payment-method-toggle'
import { CostBreakdown } from '@/components/payment/cost-breakdown'
import { InsufficientFundsAlert } from '@/components/payment/insufficient-funds-alert'
import {
  useCostEstimate,
  type CostEstimateParams,
} from '@/hooks/use-cost-estimate'
import { useCanAfford } from '@/hooks/use-can-afford'
import { useWallet } from '@/providers/wallet-provider'
import { PaymentMethod, isBlockchainPAYGCompatible } from 'aleph-sdk'

export function CheckoutSummary({
  onPaymentMethodChange,
  className,
  ...costParams
}: CostEstimateParams & {
  onPaymentMethodChange: (method: PaymentMethod) => void
  className?: string
}) {
  const { blockchainId } = useWallet()
  const streamDisabled = !isBlockchainPAYGCompatible(blockchainId)

  const { costSummary, isLoading: costLoading } =
    useCostEstimate(costParams)

  const { canAfford, balance, required, isLoading: balanceLoading } =
    useCanAfford({
      cost: costSummary?.cost,
      paymentMethod: costParams.paymentMethod,
    })

  return (
    <div className={className}>
      <PaymentMethodToggle
        value={costParams.paymentMethod}
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
        <InsufficientFundsAlert balance={balance} required={required} />
      )}
    </div>
  )
}
