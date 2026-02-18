'use client'

import Link from 'next/link'
import { Button, GlowLine, Heading } from '@/components/data-terminal'
import { VolumeWizardContent } from '@/components/infrastructure/volume-wizard-content'
import { DomainWizardContent } from '@/components/infrastructure/domain-wizard-content'
import { WebsiteWizardContent } from '@/components/infrastructure/website-wizard-content'
import { useDrawer } from '@/hooks/use-drawer'
import { Server, HardDrive, Globe, FileCode } from 'lucide-react'
import type { ReactNode } from 'react'

interface DrawerAction {
  label: string
  icon: ReactNode
  wizardContent: (closeDrawer: () => void) => ReactNode
  title: string
}

const drawerActions: DrawerAction[] = [
  {
    label: 'New Volume',
    icon: <HardDrive size={16} />,
    title: 'New Volume',
    wizardContent: (close) => (
      <VolumeWizardContent variant="drawer" onComplete={close} onBack={close} />
    ),
  },
  {
    label: 'New Domain',
    icon: <Globe size={16} />,
    title: 'New Domain',
    wizardContent: (close) => (
      <DomainWizardContent variant="drawer" onComplete={close} onBack={close} />
    ),
  },
  {
    label: 'New Website',
    icon: <FileCode size={16} />,
    title: 'New Website',
    wizardContent: (close) => (
      <WebsiteWizardContent variant="drawer" onComplete={close} onBack={close} />
    ),
  },
]

export function QuickActions() {
  const { openDrawer, closeDrawer } = useDrawer()

  return (
    <div>
      <Heading level={4}>Quick Actions</Heading>
      <GlowLine className="my-3" />
      <div className="flex flex-wrap gap-3">
        <Link href="/compute/new">
          <Button variant="secondary" size="sm" iconLeft={<Server size={16} />}>
            New Instance
          </Button>
        </Link>
        {drawerActions.map((action) => (
          <Button
            key={action.label}
            variant="secondary"
            size="sm"
            iconLeft={action.icon}
            onClick={() =>
              openDrawer({
                title: action.title,
                tag: 'NEW',
                content: action.wizardContent(closeDrawer),
              })
            }
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
