'use client'

import Link from 'next/link'
import { Button, GlowLine, Heading } from '@/components/data-terminal'
import { Server, HardDrive, Globe, FileCode } from 'lucide-react'

const actions = [
  {
    label: 'New Instance',
    href: '/compute/new',
    icon: <Server size={16} />,
  },
  {
    label: 'New Volume',
    href: '/infrastructure/volumes/new',
    icon: <HardDrive size={16} />,
  },
  {
    label: 'New Domain',
    href: '/infrastructure/domains/new',
    icon: <Globe size={16} />,
  },
  {
    label: 'New Website',
    href: '/infrastructure/websites/new',
    icon: <FileCode size={16} />,
  },
] as const

export function QuickActions() {
  return (
    <div>
      <Heading level={4}>Quick Actions</Heading>
      <GlowLine className="my-3" />
      <div className="flex flex-wrap gap-3">
        {actions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Button variant="secondary" size="sm" iconLeft={action.icon}>
              {action.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  )
}
