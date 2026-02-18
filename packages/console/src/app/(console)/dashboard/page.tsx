import { GlowLine } from '@/components/data-terminal'
import { PageHeader } from '@/components/shell/page-header'
import { DashboardStatCards } from '@/components/dashboard/stat-cards'
import { ResourceHealth } from '@/components/dashboard/resource-health'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { GettingStarted } from '@/components/dashboard/getting-started'

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader />

      <DashboardStatCards />

      <GlowLine />

      <GettingStarted />

      <ResourceHealth />

      <QuickActions />
    </div>
  )
}
