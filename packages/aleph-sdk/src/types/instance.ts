import type { HostRequirements, InstanceContent } from '@aleph-sdk/message'
import type { EntityType } from '@/constants'
import type { CostSummary } from '@/types/cost'
import type {
  ExecutableStatus,
  PaymentConfiguration,
} from '@/types/executable'
import type {
  DomainField,
  EnvVarField,
  InstanceImageField,
  InstanceSpecsField,
  InstanceSystemVolumeField,
  NameAndTagsField,
  SSHKeyField,
  VolumeField,
} from '@/types/fields'
import type { CRNSpecs } from '@/types/node'

export type AddInstance = NameAndTagsField & {
  image: InstanceImageField
  specs: InstanceSpecsField
  sshKeys: SSHKeyField[]
  volumes?: VolumeField[]
  systemVolume: InstanceSystemVolumeField
  envVars?: EnvVarField[]
  domains?: Omit<DomainField, 'ref'>[]
  payment?: PaymentConfiguration
  requirements?: HostRequirements
  node?: CRNSpecs
}

export type Instance = InstanceContent & {
  type: EntityType.Instance
  id: string
  name: string
  url: string
  date: string
  size: number
  confirmed?: boolean
}

export type InstanceEntity = Omit<Instance, 'type'> & {
  type: EntityType.Instance | EntityType.GpuInstance | EntityType.Confidential
}

export type InstanceCostProps = AddInstance

export type InstanceCost = CostSummary

export type InstanceCRNNetworking = {
  ipv4: string
  ipv6: string
}

export type InstanceStatus = ExecutableStatus
