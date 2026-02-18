'use client'

import { TerminalCard, Heading, Text } from '@/components/data-terminal'
import { Server, FileCode, HardDrive, Globe } from 'lucide-react'
import type { ReactNode } from 'react'

interface Feature {
  icon: ReactNode
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: <Server size={24} />,
    title: 'Deploy Virtual Machines',
    description:
      'Launch persistent VMs with custom configurations. Choose your OS, CPU, RAM, and storage.',
  },
  {
    icon: <FileCode size={24} />,
    title: 'Host Websites',
    description:
      'Deploy static websites and web apps with built-in framework support and custom domains.',
  },
  {
    icon: <HardDrive size={24} />,
    title: 'Store Data',
    description:
      'Create persistent storage volumes backed by the decentralized Aleph network.',
  },
  {
    icon: <Globe size={24} />,
    title: 'Custom Domains',
    description:
      'Link your own domain names to any deployed resource with automatic DNS configuration.',
  },
]

export function FeatureHighlights() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {features.map((feature) => (
        <TerminalCard key={feature.title} interactive>
          <div className="flex flex-col gap-3 p-5">
            <span className="text-accent">{feature.icon}</span>
            <Heading level={4}>{feature.title}</Heading>
            <Text variant="small" className="text-foreground/60">
              {feature.description}
            </Text>
          </div>
        </TerminalCard>
      ))}
    </div>
  )
}
