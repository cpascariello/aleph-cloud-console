'use client'

import { useEffect } from 'react'
import { TerminalCard, Button, Badge, HudLabel, Text } from '@/components/data-terminal'
import { WizardStep } from '@/components/wizard/wizard-step'
import { Cpu, HardDrive, MemoryStick } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string
  cpu: number
  ram: number
  storage: number
  image: string
  category: string
}

const TEMPLATES: Template[] = [
  {
    id: 'web-server',
    name: 'Web Server',
    description: 'Nginx + Node.js ready to serve',
    cpu: 2,
    ram: 2048,
    storage: 20,
    image: 'Ubuntu 24.04 LTS',
    category: 'Web Hosting',
  },
  {
    id: 'database',
    name: 'Database Server',
    description: 'PostgreSQL with optimized settings',
    cpu: 4,
    ram: 4096,
    storage: 50,
    image: 'Debian 12',
    category: 'Databases',
  },
  {
    id: 'dev-env',
    name: 'Dev Environment',
    description: 'Full development toolkit pre-installed',
    cpu: 2,
    ram: 4096,
    storage: 30,
    image: 'Ubuntu 24.04 LTS',
    category: 'Dev Tools',
  },
  {
    id: 'ai-ml',
    name: 'AI/ML Workbench',
    description: 'Python + PyTorch + Jupyter ready',
    cpu: 8,
    ram: 8192,
    storage: 100,
    image: 'Ubuntu 24.04 LTS',
    category: 'AI/ML',
  },
]

interface TemplateStepProps {
  onSelectTemplate: (template: Template) => void
  onStartFromScratch: () => void
  setValid: (valid: boolean) => void
}

export type { Template }

export function TemplateStep({
  onSelectTemplate,
  onStartFromScratch,
  setValid,
}: TemplateStepProps) {
  useEffect(() => {
    setValid(true)
  }, [setValid])

  return (
    <WizardStep
      title="Choose a Template"
      description="Start with a pre-configured template or build from scratch."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((tpl) => (
          <TerminalCard key={tpl.id} tag={tpl.category} label={tpl.name}>
            <div className="flex flex-col gap-3 p-3">
              <Text variant="small">{tpl.description}</Text>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Cpu size={12} />
                  {tpl.cpu} vCPU
                </span>
                <span className="flex items-center gap-1">
                  <MemoryStick size={12} />
                  {tpl.ram >= 1024
                    ? `${tpl.ram / 1024} GB`
                    : `${tpl.ram} MB`}
                </span>
                <span className="flex items-center gap-1">
                  <HardDrive size={12} />
                  {tpl.storage} GB
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="info">{tpl.image}</Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onSelectTemplate(tpl)}
                >
                  Use Template
                </Button>
              </div>
            </div>
          </TerminalCard>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <HudLabel>Or</HudLabel>
        <Button variant="ghost" size="sm" onClick={onStartFromScratch}>
          Start from scratch
        </Button>
      </div>
    </WizardStep>
  )
}
