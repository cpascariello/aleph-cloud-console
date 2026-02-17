import type { GPUDevice } from '@/types/cost'

export type NodeType = 'ccn' | 'crn'

export type NodeLastVersions = {
  latest: string | null
  prerelease: string | null
  outdated: string | null
}

export type BaseNodeStatus = 'active' | 'waiting'

export type BaseNode = {
  hash: string
  owner: string
  reward: string
  locked: boolean
  authorized?: string[]
  time: number
  score: number
  score_updated: boolean
  decentralization: number
  performance: number
  name?: string
  picture?: string
  banner?: string
  description?: string
  inactive_since?: number
  manager?: string
  registration_url?: string
  virtual?: number
}

export type CCN = BaseNode & {
  multiaddress?: string
  status: BaseNodeStatus
  has_bonus: boolean
  resource_nodes: string[]
  stakers: Record<string, number>
  total_staked: number
  scoreData?: CCNScore
  metricsData?: CCNMetrics
  crnsData: CRN[]
}

export type CRN = BaseNode & {
  address?: string
  status: BaseNodeStatus | 'linked'
  parent: string | null
  type: string | 'compute'
  scoreData?: CRNScore
  metricsData?: CRNMetrics
  parentData?: CCN
  stream_reward?: string
  terms_and_conditions?: string
}

export type AlephNode = CCN | CRN

export type BaseNodeScore = {
  decentralization: number
  node_id: string
  performance: number
  total_score: number
  version: number
}

export type BaseNodeScoreMeasurements = {
  total_nodes: number
  node_version_other: number
  node_version_latest: number
  node_version_missing: number
  node_version_obsolete: number
  node_version_outdated: number
  base_latency_score_p25: number
  base_latency_score_p95: number
  node_version_prerelease: number
  nodes_with_identical_asn: number
}

export type CCNScore = BaseNodeScore & {
  measurements: BaseNodeScoreMeasurements & {
    metrics_latency_score_p25: number
    metrics_latency_score_p95: number
    eth_height_remaining: number
    file_download_latency_score_p25: number
    file_download_latency_score_p95: number
    txs_total: number
    pending_messages: number
    aggregate_latency_score_p25: number
    aggregate_latency_score_p95: number
  }
}

export type CRNScore = BaseNodeScore & {
  measurements: BaseNodeScoreMeasurements & {
    full_check_latency: number
    diagnostic_vm_latency: number
  }
}

export type CCNMetrics = {
  asn: number
  as_name: string
  measured_at: number
}

export type CRNMetrics = {
  asn: number
  as_name: string
  measured_at: number
  cpu: {
    count: number
    load_average: { load1: number; load5: number; load15: number }
    core_frequencies: { min: number; max: number }
  }
  mem: { total_kB: number; available_kB: number }
  disk: { total_kB: number; available_kB: number }
  gpu?: {
    devices: GPUDevice[]
    available_devices: GPUDevice[]
  }
}

export type CRNSpecs = {
  hash: string
  name?: string
  cpu: number
  ram: number
  storage: number
  gpu?: GPUDevice
  address?: string
  stream_reward?: string
  terms_and_conditions?: string
}

export type Specs = {
  cpu: number
  ram: number
  storage: number
}

export type CRNConfig = {
  computing: {
    ENABLE_QEMU_SUPPORT: boolean
    ENABLE_CONFIDENTIAL_COMPUTING: boolean
  }
  payment: {
    PAYMENT_RECEIVER_ADDRESS: string
    PAYMENT_MONITOR_ADDRESS: string
    PAYMENT_SUPER_TOKEN: string
  }
}

export type CRNBenchmark = {
  hash: string
  name: string
  benchmark: number
}
