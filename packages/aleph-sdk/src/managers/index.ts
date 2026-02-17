// Manager interfaces
export type {
  EntityManager,
  ReadOnlyEntityManager,
  EntityManagerFetchOptions,
} from '@/managers/types'

// Base managers
export { ExecutableManager } from '@/managers/executable'
export type {
  KeyPair,
  AuthPubKeyToken,
  ExecutableCostProps,
} from '@/managers/executable'

// Foundation managers
export { FileManager } from '@/managers/file'
export { MessageManager } from '@/managers/message'
export { SSHKeyManager } from '@/managers/ssh'
export { DomainManager } from '@/managers/domain'
export { VolumeManager } from '@/managers/volume'
export { CostManager } from '@/managers/cost'
export { NodeManager } from '@/managers/node'
export type {
  NodesResponse,
  NewCCN,
  NewCRN,
  UpdateCCN,
  UpdateCRN,
  UpdateAlephNode,
  ReducedCRNSpecs,
  CRNIps,
} from '@/managers/node'
export { StreamNotSupportedIssue } from '@/managers/node'
export { ForwardedPortsManager } from '@/managers/forwarded-ports'
export { WebsiteManager } from '@/managers/website'

// Compute managers
export { InstanceManager } from '@/managers/instance'
export { GpuInstanceManager } from '@/managers/gpu-instance'
export type { GpuInstance, GpuInstanceCostProps, GpuInstanceCost } from '@/managers/gpu-instance'
export { ConfidentialManager } from '@/managers/confidential'
export type { Confidential } from '@/managers/confidential'
export { ProgramManager } from '@/managers/program'

// Factory
export { createManagers } from '@/managers/factory'
export type { AlephManagers } from '@/managers/factory'
