'use client'

import { PageHeader } from '@/components/shell/page-header'
import { ConnectedDashboard } from '@/components/dashboard/connected-dashboard'
import { DisconnectedDashboard } from '@/components/dashboard/disconnected-dashboard'
import { useWallet } from '@/providers/wallet-provider'

export default function DashboardPage() {
  const { isConnected } = useWallet()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader />
      {isConnected ? <ConnectedDashboard /> : <DisconnectedDashboard />}
    </div>
  )
}
