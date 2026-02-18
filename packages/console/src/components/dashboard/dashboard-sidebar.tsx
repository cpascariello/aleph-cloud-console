'use client'

import { QuickActions } from '@/components/dashboard/quick-actions'
import { QuickLinks } from '@/components/dashboard/quick-links'
import { GettingStarted } from '@/components/dashboard/getting-started'

export function DashboardSidebar() {
  return (
    <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
      <QuickActions />
      <QuickLinks />
      <GettingStarted />
    </div>
  )
}
