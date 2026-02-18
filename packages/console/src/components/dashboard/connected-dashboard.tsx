'use client'

import { GlowLine } from '@/components/data-terminal'
import { DashboardStatCards } from '@/components/dashboard/stat-cards'
import { ResourceHealth } from '@/components/dashboard/resource-health'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'

export function ConnectedDashboard() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-8">
        <DashboardStatCards />
        <GlowLine />
        <ResourceHealth />
      </div>
      <DashboardSidebar />
    </div>
  )
}
