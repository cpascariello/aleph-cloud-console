import type { EntityDomainType, EntityType } from '@/constants'

export type DomainAggregateItem = {
  type: EntityDomainType
  programType: EntityDomainType
  message_id: string
  updated_at: string
  options?: Record<string, unknown>
}

export type DomainAggregate = Record<string, DomainAggregateItem | null>

export type AddDomain = {
  name: string
  target: EntityDomainType
  ref: string
}

export type Domain = AddDomain & {
  type: EntityType.Domain
  id: string
  updated_at: string
  date: string
  size: number
  refUrl: string
  confirmed?: boolean
}

export type DomainStatus = {
  status: boolean
  tasks_status: {
    cname: boolean
    delegation: boolean
    owner_proof: boolean
  }
  err: string
  help: string
}
