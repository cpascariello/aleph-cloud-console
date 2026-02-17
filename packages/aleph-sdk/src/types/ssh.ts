import type { EntityType } from '@/constants'

export type AddSSHKey = {
  key: string
  label?: string
}

export type SSHKey = AddSSHKey & {
  type: EntityType.SSHKey
  id: string
  name: string
  url: string
  size: number
  date: string
  confirmed?: boolean
}
