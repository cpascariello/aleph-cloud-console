import type { StoreContent } from '@aleph-sdk/message'
import type { EntityType, VolumeType } from '@/constants'

export type AddNewVolume = {
  volumeType: VolumeType.New
  file?: File
  mountPath?: string
  useLatest?: boolean
  size?: number
}

export type AddExistingVolume = {
  volumeType: VolumeType.Existing
  mountPath: string
  refHash: string
  useLatest: boolean
  size?: number
  estimated_size_mib?: number
}

export type AddPersistentVolume = {
  volumeType: VolumeType.Persistent
  name: string
  mountPath: string
  size: number
}

export type AddVolume = AddNewVolume | AddExistingVolume | AddPersistentVolume

export type BaseVolume = StoreContent & {
  id: string
  url: string
  date: string
  size?: number
  confirmed?: boolean
}

export type NewVolume = BaseVolume & {
  type: EntityType.Volume
  volumeType: VolumeType.New
  file?: File
  mountPath: string
  useLatest: boolean
  size?: number
}

export type ExistingVolume = BaseVolume & {
  type: EntityType.Volume
  volumeType: VolumeType.Existing
  mountPath: string
  refHash: string
  useLatest: boolean
  size?: number
}

export type PersistentVolume = BaseVolume & {
  type: EntityType.Volume
  volumeType: VolumeType.Persistent
  name: string
  mountPath: string
  size: number
}

export type Volume = NewVolume | ExistingVolume | PersistentVolume
