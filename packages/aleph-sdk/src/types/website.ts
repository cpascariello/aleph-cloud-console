import { type EntityType, WebsiteFrameworkId } from '@/constants'
import type { DomainField, NameAndTagsField } from '@/types/fields'

export type WebsiteFramework = {
  id: WebsiteFrameworkId
  name: string
  docs?: Array<{ type: 'text' | 'code'; value: string; height?: string }>
}

export const WebsiteFrameworks: Record<WebsiteFrameworkId, WebsiteFramework> = {
  [WebsiteFrameworkId.None]: {
    id: WebsiteFrameworkId.None,
    name: 'Not Specified',
  },
  [WebsiteFrameworkId.Nextjs]: {
    id: WebsiteFrameworkId.Nextjs,
    name: 'Next.js',
  },
  [WebsiteFrameworkId.React]: {
    id: WebsiteFrameworkId.React,
    name: 'React',
  },
  [WebsiteFrameworkId.Vue]: {
    id: WebsiteFrameworkId.Vue,
    name: 'Vue.js',
  },
}

export type WebsiteAggregateItem = {
  metadata?: {
    name?: string
    tags?: string[]
    framework?: WebsiteFrameworkId
  }
  version?: number
  volume_id?: string
  volume_history?: string[]
  ens?: string
  created_at?: number | string
  updated_at: number | string
}

export type WebsiteData = {
  folder?: File[]
  cid: string
}

export type AddWebsite = NameAndTagsField & {
  framework: WebsiteFrameworkId
  website: WebsiteData
  domains?: Omit<DomainField, 'ref'>[]
  ens?: string
}

export type Website = {
  type: EntityType.Website
  id: string
  name: string
  url: string
  created_at: string
  updated_at: string
  size: number
  version: number
  framework: WebsiteFrameworkId
  volume_id?: string
  volume_history?: string[]
  ens?: string
  confirmed?: boolean
}
