'use client'

import {
  GlowLine,
  HudLabel,
  TerminalCard,
  Text,
} from '@/components/data-terminal'
import type { Instance } from 'aleph-sdk'
import { blockchains } from 'aleph-sdk'

function formatPaymentType(type: string): string {
  if (type === 'hold') return 'Hold'
  if (type === 'superfluid') return 'Stream (PAYG)'
  return type
}

function formatChainName(chain: string): string {
  const config = blockchains[chain]
  if (config) return config.name
  return chain
}

interface PaymentTabProps {
  instance: Instance
}

export function PaymentTab({ instance }: PaymentTabProps) {
  const payment = instance.payment

  if (!payment) {
    return (
      <TerminalCard tag="PAY" label="Payment">
        <div className="p-4">
          <Text variant="muted">No payment information available.</Text>
        </div>
      </TerminalCard>
    )
  }

  return (
    <TerminalCard tag="PAY" label="Payment">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3 text-sm">
          <HudLabel>Type</HudLabel>
          <span>{formatPaymentType(payment.type)}</span>
        </div>
        <GlowLine />
        <div className="flex items-center gap-3 text-sm">
          <HudLabel>Blockchain</HudLabel>
          <span>{formatChainName(payment.chain)}</span>
        </div>
        <GlowLine />
        <div className="flex items-center gap-3 text-sm">
          <HudLabel>Start Date</HudLabel>
          <span>{instance.date}</span>
        </div>
      </div>
    </TerminalCard>
  )
}
