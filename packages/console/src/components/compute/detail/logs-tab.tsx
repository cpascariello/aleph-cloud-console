'use client'

import { useState } from 'react'
import {
  TerminalWindow,
  Select,
  SearchInput,
  Toggle,
  HudLabel,
} from '@/components/data-terminal'

interface LogsTabProps {
  instanceId: string
}

const LOG_LEVELS = [
  { value: 'all', label: 'All Levels' },
  { value: 'error', label: 'Error' },
  { value: 'warn', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'debug', label: 'Debug' },
]

export function LogsTab({ instanceId }: LogsTabProps) {
  const [logLevel, setLogLevel] = useState('all')
  const [search, setSearch] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)

  // Placeholder logs until real log streaming is wired
  const logs = [
    `[INFO] Instance ${instanceId} starting...`,
    '[INFO] Initializing network interfaces...',
    '[INFO] Mounting volumes...',
    '[INFO] SSH daemon started on port 22',
    '[INFO] Instance ready',
  ]

  const filteredLogs = logs.filter((line) => {
    if (logLevel !== 'all') {
      const levelTag = `[${logLevel.toUpperCase()}]`
      if (!line.includes(levelTag)) return false
    }
    if (search && !line.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Select
          label="Level"
          options={LOG_LEVELS}
          value={logLevel}
          onChange={setLogLevel}
        />
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Filter logs..."
          />
        </div>
        <div className="flex items-center gap-2">
          <HudLabel>Auto-scroll</HudLabel>
          <Toggle checked={autoScroll} onChange={setAutoScroll} />
        </div>
      </div>
      <TerminalWindow
        label="Instance Logs"
        command={`logs --follow ${instanceId}`}
        output={filteredLogs}
      />
    </div>
  )
}
