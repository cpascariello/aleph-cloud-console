import { Heading, GlowLine, Text } from '@/components/data-terminal'
import { DashboardStatCards } from '@/components/dashboard/stat-cards'
import { ResourceHealth } from '@/components/dashboard/resource-health'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { GettingStarted } from '@/components/dashboard/getting-started'

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Heading level={1}>Dashboard</Heading>
        <Text variant="muted">
          Overview of your Aleph Cloud resources
        </Text>
      </div>

      <DashboardStatCards />

      <GlowLine />

      <GettingStarted />

      <ResourceHealth />

      <QuickActions />
    </div>
  )
}
