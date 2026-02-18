'use client'

import { usePathname } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { Breadcrumbs } from '@/components/data-terminal'
import type { BreadcrumbItem } from '@dt/molecules/breadcrumbs'
import { sidebarItems } from '@/components/shell/sidebar-config'

const navigablePaths = new Set<string>()
for (const group of sidebarItems) {
  if (group.children) {
    for (const item of group.children) {
      if (item.href) navigablePaths.add(item.href)
    }
  }
}

const segmentLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  compute: 'Compute',
  infrastructure: 'Infrastructure',
  volumes: 'Volumes',
  domains: 'Domains',
  websites: 'Websites',
  marketplace: 'Marketplace',
  templates: 'Templates',
  images: 'Community Images',
  settings: 'Settings',
  account: 'Account',
  billing: 'Billing',
  'ssh-keys': 'SSH Keys',
  new: 'New',
  monitoring: 'Monitoring',
}

function isHashId(segment: string): boolean {
  return segment.length > 10 && /^[a-f0-9]+$/i.test(segment)
}

function truncate(str: string, len = 8): string {
  return str.length <= len ? str : `${str.slice(0, len)}\u2026`
}

function buildCrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: BreadcrumbItem[] = []
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!
    const href = '/' + segments.slice(0, i + 1).join('/')
    const isLast = i === segments.length - 1
    const isNavigable = navigablePaths.has(href)
      || segment === 'new'
      || isHashId(segment)
    if (!isLast && !isNavigable) continue
    const label = segmentLabels[segment]
      ?? (isHashId(segment) ? truncate(segment) : segment)
    crumbs.push({
      label,
      href: isLast ? undefined : href,
    })
  }
  return crumbs
}

export function PageHeader({ children }: { children?: ReactNode }) {
  const pathname = usePathname()
  const crumbs = buildCrumbs(pathname)

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean)
    const lastSegment = segments.at(-1) ?? ''
    const label = segmentLabels[lastSegment]
      ?? (isHashId(lastSegment) ? truncate(lastSegment) : lastSegment)
    document.title = label
      ? `${label} \u2014 Aleph Cloud Console`
      : 'Aleph Cloud Console'
  }, [pathname])

  return (
    <div className="mb-4 flex items-center justify-between">
      <Breadcrumbs
        items={crumbs}
        backHref={pathname === '/dashboard' ? undefined : '/dashboard'}
      />
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  )
}
