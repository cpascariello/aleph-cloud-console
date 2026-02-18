'use client'

import Link from 'next/link'
import { TerminalCard } from '@/components/data-terminal'
import {
  Server,
  HardDrive,
  Globe,
  FileCode,
  Key,
  ChevronRight,
} from 'lucide-react'
import type { ReactNode } from 'react'

interface QuickLink {
  label: string
  href: string
  icon: ReactNode
}

const links: QuickLink[] = [
  { label: 'Compute', href: '/compute', icon: <Server size={16} /> },
  {
    label: 'Volumes',
    href: '/infrastructure/volumes',
    icon: <HardDrive size={16} />,
  },
  {
    label: 'Domains',
    href: '/infrastructure/domains',
    icon: <Globe size={16} />,
  },
  {
    label: 'Websites',
    href: '/infrastructure/websites',
    icon: <FileCode size={16} />,
  },
  {
    label: 'SSH Keys',
    href: '/compute/ssh-keys',
    icon: <Key size={16} />,
  },
]

export function QuickLinks() {
  return (
    <TerminalCard tag="NAV" label="Quick Links">
      <div className="flex flex-col">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 transition-colors hover:bg-accent/10 hover:text-foreground"
          >
            <span className="text-accent">{link.icon}</span>
            <span className="flex-1">{link.label}</span>
            <ChevronRight size={14} className="text-foreground/30" />
          </Link>
        ))}
      </div>
    </TerminalCard>
  )
}
