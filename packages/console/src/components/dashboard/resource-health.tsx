'use client'

import { type ReactNode, useMemo } from 'react'
import Link from 'next/link'
import {
  DataTable,
  StatusDot,
  Badge,
  Skeleton,
  TerminalCard,
} from '@/components/data-terminal'
import { useInstances } from '@/hooks/queries/use-instances'
import { usePrograms } from '@/hooks/queries/use-programs'
import { useWebsites } from '@/hooks/queries/use-websites'
import { truncateHash, relativeTime } from '@/lib/format'
import { EntityType, EntityTypeName } from 'aleph-sdk'

type HealthRow = {
  name: ReactNode
  type: ReactNode
  status: ReactNode
  date: ReactNode
  id: ReactNode
}

function getStatusVariant(
  confirmed?: boolean,
): 'success' | 'warning' | 'neutral' {
  if (confirmed === undefined) return 'neutral'
  return confirmed ? 'success' : 'warning'
}

function getStatusLabel(confirmed?: boolean): string {
  if (confirmed === undefined) return 'Unknown'
  return confirmed ? 'Running' : 'Pending'
}

export function ResourceHealth() {
  const instances = useInstances()
  const programs = usePrograms()
  const websites = useWebsites()

  const isLoading =
    instances.isLoading || programs.isLoading || websites.isLoading

  const rows = useMemo<HealthRow[]>(() => {
    const result: HealthRow[] = []

    for (const inst of instances.data ?? []) {
      result.push({
        name: (
          <Link
            href={`/compute/${inst.id}`}
            className="text-accent hover:underline font-mono text-sm"
          >
            {inst.name || truncateHash(inst.id)}
          </Link>
        ),
        type: (
          <Badge variant="info">
            {EntityTypeName[inst.type as EntityType] ?? 'Instance'}
          </Badge>
        ),
        status: (
          <span className="flex items-center gap-2">
            <StatusDot variant={getStatusVariant(inst.confirmed)} />
            <span className="text-sm">
              {getStatusLabel(inst.confirmed)}
            </span>
          </span>
        ),
        date: (
          <span className="text-muted-foreground text-sm">
            {relativeTime(inst.date)}
          </span>
        ),
        id: (
          <span className="font-mono text-xs text-muted-foreground">
            {truncateHash(inst.id)}
          </span>
        ),
      })
    }

    for (const prog of programs.data ?? []) {
      result.push({
        name: (
          <Link
            href={`/compute/${prog.id}`}
            className="text-accent hover:underline font-mono text-sm"
          >
            {prog.name || truncateHash(prog.id)}
          </Link>
        ),
        type: <Badge variant="neutral">Function</Badge>,
        status: (
          <span className="flex items-center gap-2">
            <StatusDot variant={getStatusVariant(prog.confirmed)} />
            <span className="text-sm">
              {getStatusLabel(prog.confirmed)}
            </span>
          </span>
        ),
        date: (
          <span className="text-muted-foreground text-sm">
            {relativeTime(prog.date)}
          </span>
        ),
        id: (
          <span className="font-mono text-xs text-muted-foreground">
            {truncateHash(prog.id)}
          </span>
        ),
      })
    }

    for (const site of websites.data ?? []) {
      result.push({
        name: (
          <Link
            href={`/infrastructure/websites/${site.id}`}
            className="text-accent hover:underline font-mono text-sm"
          >
            {site.name || truncateHash(site.id)}
          </Link>
        ),
        type: <Badge variant="neutral">Website</Badge>,
        status: (
          <span className="flex items-center gap-2">
            <StatusDot variant={getStatusVariant(site.confirmed)} />
            <span className="text-sm">
              {getStatusLabel(site.confirmed)}
            </span>
          </span>
        ),
        date: (
          <span className="text-muted-foreground text-sm">
            {relativeTime(site.date)}
          </span>
        ),
        id: (
          <span className="font-mono text-xs text-muted-foreground">
            {truncateHash(site.id)}
          </span>
        ),
      })
    }

    return result
  }, [instances.data, programs.data, websites.data])

  if (isLoading) {
    return <Skeleton variant="card" height="200px" />
  }

  if (rows.length === 0) {
    return null
  }

  return (
    <TerminalCard tag="SYS" label="Resource Health">
      <DataTable
        columns={[
          { key: 'name', label: 'Name', sortable: true },
          { key: 'type', label: 'Type', sortable: true },
          { key: 'status', label: 'Status', sortable: true },
          { key: 'date', label: 'Created', sortable: true },
          { key: 'id', label: 'ID' },
        ]}
        rows={rows}
      />
    </TerminalCard>
  )
}
