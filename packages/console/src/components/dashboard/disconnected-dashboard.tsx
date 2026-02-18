'use client'

import { GlowLine } from '@/components/data-terminal'
import { FeatureHighlights } from '@/components/dashboard/feature-highlights'
import { NetworkStats } from '@/components/dashboard/network-stats'
import { ConnectCTA } from '@/components/dashboard/connect-cta'

export function DisconnectedDashboard() {
  return (
    <div className="flex flex-col gap-8">
      <FeatureHighlights />
      <GlowLine />
      <NetworkStats />
      <GlowLine />
      <ConnectCTA />
    </div>
  )
}
