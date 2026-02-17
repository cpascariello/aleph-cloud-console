'use client'

import { RadioGroup } from '@/components/data-terminal'
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
        onChange={(val) => {
          const method = val as PaymentMethod
          if (method === PaymentMethod.Stream && streamDisabled) return
          onChange(method)
        }}
      />
    </div>
  )
}
