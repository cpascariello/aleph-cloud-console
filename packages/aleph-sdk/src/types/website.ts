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
  type: 'website'
  programType: 'website'
  message_id: string
  updated_at: string
  framework?: WebsiteFrameworkId
  name?: string
  volume_id?: string
  volume_history?: string[]
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
  date: string
  updated_at: string
  size: number
  framework: WebsiteFrameworkId
  volume_id?: string
  volume_history?: string[]
  confirmed?: boolean
}
