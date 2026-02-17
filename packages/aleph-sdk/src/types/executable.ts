import type { BaseExecutableContent } from '@aleph-sdk/message'
import type { EntityType, PaymentMethod } from '@/constants'
import type { Blockchain as BlockchainId } from '@aleph-sdk/core'
import type { StreamDurationField } from '@/types/fields'
import type { CRN } from '@/types/node'

export type HoldPaymentConfiguration = {
  chain: BlockchainId
  type: PaymentMethod.Hold
}

export type StreamPaymentConfiguration = {
  chain: BlockchainId
  type: PaymentMethod.Stream
  sender: string
  receiver: string
  streamCost: number
  streamDuration: StreamDurationField
}

export type PaymentConfiguration =
  | HoldPaymentConfiguration
  | StreamPaymentConfiguration

export type Executable = BaseExecutableContent & {
  type:
    | EntityType.Instance
    | EntityType.GpuInstance
    | EntityType.Confidential
    | EntityType.Program
  id: string
  chain?: BlockchainId
  payment?: BaseExecutableContent['payment']
  environment?: unknown
  requirements?: unknown
}

export type ExecutableSchedulerAllocation = {
  vm_hash: string
  vm_type: EntityType.Instance | EntityType.Program
  vm_ipv6: string
  period: {
    start_timestamp: string
    duration_seconds: number
  }
  node: {
    node_id: string
    url: string
    ipv6: string
    supports_ipv6: boolean
  }
}

export type ExecutableCalculatedStatus =
  | 'v1'
  | 'loading'
  | 'not-allocated'
  | 'stopped'
  | 'stopping'
  | 'running'
  | 'preparing'
  | 'starting'
  | 'rebooting'

export type ExecutableStatus = {
  version: 'v1' | 'v2'
  hash: string
  ipv4: string
  ipv6: string
  ipv6Parsed: string
  node: CRN
  hostIpv4?: string
  ipv4Parsed?: string
  mappedPorts?: Record<string, { host: number; tcp: boolean; udp: boolean }>
  status?: {
    running: boolean
    definedAt?: string
    preparingAt?: string
    preparedAt?: string
    startingAt?: string
    startedAt?: string
    stoppingAt?: string
    stoppedAt?: string
  }
}

export type ExecutableOperations =
  | 'reboot'
  | 'stop'
  | 'confidential_init_secret'
  | 'erase'

export type StreamPaymentDetail = {
  sender: string
  receiver: string
  flowRate: bigint
  lastUpdated: number
}

export type StreamPaymentDetails = {
  senderToReceiver?: StreamPaymentDetail
  senderToCommunity?: StreamPaymentDetail
}

export type KeyOpsType = 'sign' | 'verify'

export type SignedPublicKeyHeader = {
  payload: string
  signature: string
}
