// Re-export Account type from @aleph-sdk/account
export type { Account } from '@aleph-sdk/account'

// Types
export * from '@/types/index'

// Provider type guards
export type {
  Eip155Provider,
  SolanaWalletProvider,
  MultiChainProvider,
} from '@/types/provider'
export { isEip155Provider, isSolanaProvider } from '@/types/provider'

// Constants
export {
  DEFAULT_API_SERVER,
  DEFAULT_WS_SERVER,
  defaultConsoleChannel,
  defaultAccountChannel,
  defaultVolumeChannel,
  defaultSSHChannel,
  defaultInstanceChannel,
  defaultGpuInstanceChannel,
  defaultConfidentialInstanceChannel,
  defaultProgramChannel,
  defaultDomainChannel,
  defaultWebsiteChannel,
  defaultDomainAggregateKey,
  defaultWebsiteAggregateKey,
  defaultPortForwardingAggregateKey,
  defaultPermissionsAggregateKey,
  defaultSSHPostType,
  communityWalletAddress,
  erc20Address,
  superToken,
  blockchains,
  networks,
  programStorageURL,
} from '@/constants'

// Manager interfaces
export type {
  EntityManager,
  ReadOnlyEntityManager,
  EntityManagerFetchOptions,
} from '@/managers/types'

// Managers
export { AggregateManager } from '@/managers/aggregate'
export type { AggregateContent } from '@/managers/aggregate'
export { CostManager } from '@/managers/cost'
export { SSHKeyManager } from '@/managers/ssh'
export { DomainManager } from '@/managers/domain'
export { VolumeManager } from '@/managers/volume'
export type { VolumeCostProps, VolumeCost } from '@/managers/volume'
export { InstanceManager } from '@/managers/instance'
export { GpuInstanceManager } from '@/managers/gpu-instance'
export { ConfidentialManager } from '@/managers/confidential'
export { ProgramManager } from '@/managers/program'
export { WebsiteManager } from '@/managers/website'
export type {
  WebsiteFolderField,
  WebsiteCostProps,
  WebsiteCost,
  HistoryVolumes,
} from '@/managers/website'
export { FileManager } from '@/managers/file'
export type {
  FileObject,
  FilesInfo,
  AccountFileObject,
  AccountFilesResponse,
} from '@/managers/file'
export { NodeManager } from '@/managers/node'
export { MessageManager } from '@/managers/message'
export { ForwardedPortsManager } from '@/managers/forwarded-ports'
export { BalanceManager } from '@/managers/balance'

// Factory
export { createManagers } from '@/managers/factory'
export type { AlephManagers } from '@/managers/factory'

// Errors
export { default as Err } from '@/errors'

// Utilities
export {
  getDate,
  getExplorerURL,
  convertKeysToCamelCase,
  humanReadableSize,
  convertByteUnits,
  round,
  sleep,
  getHours,
  getVersionNumber,
  extractValidEthAddress,
  getLatestReleases,
  fetchAndCache,
  isBlockchainPAYGCompatible,
  downloadBlob,
  Mutex,
} from '@/utils'
