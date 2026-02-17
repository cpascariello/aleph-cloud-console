/**
 * Form field types used by managers for create/update operations.
 * These were originally defined in React hooks but are extracted here
 * to keep the SDK framework-agnostic.
 */

import type { EntityDomainType, VolumeType } from '@/constants'

export type EnvVarField = {
  name: string
  value: string
}

export type InstanceSpecsField = {
  cpu: number
  ram: number
  storage: number
  disabled?: boolean
  disabledReason?: string
}

export type SSHKeyField = {
  key: string
  label?: string
  isSelected: boolean
  isNew: boolean
}

export type NewVolumeStandaloneField = {
  volumeType: VolumeType.New
  file?: File
}

export type NewVolumeField = NewVolumeStandaloneField & {
  mountPath: string
  useLatest: boolean
}

export type ExistingVolumeField = {
  volumeType: VolumeType.Existing
  mountPath: string
  refHash: string
  useLatest: boolean
  size?: number
  estimated_size_mib?: number
}

export type PersistentVolumeField = {
  volumeType: VolumeType.Persistent
  name: string
  mountPath: string
  size: number
}

export type VolumeField =
  | NewVolumeStandaloneField
  | NewVolumeField
  | ExistingVolumeField
  | PersistentVolumeField

export type InstanceSystemVolumeField = {
  size: number
}

export type DomainField = {
  name: string
  ref: string
  target: EntityDomainType
}

export type StreamDurationUnit = 'h' | 'd' | 'w' | 'm' | 'y'

export type StreamDurationField = {
  duration: number
  unit: StreamDurationUnit
}

export type InstanceImageField = string

export type NameAndTagsField = {
  name: string
  tags?: string[]
}
