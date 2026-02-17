import { Blockchain as BlockchainId } from '@aleph-sdk/core'

// API Servers
export const DEFAULT_API_SERVER = 'https://api.aleph.im'
export const DEFAULT_WS_SERVER = 'wss://api.aleph.im'

// Channels
export const defaultConsoleChannel = 'ALEPH-CLOUDSOLUTIONS'
export const defaultAccountChannel = 'ALEPH-ACCOUNT'
export const channel = 'FOUNDATION'
export const tags = ['mainnet']
export const postType = 'corechan-operation'
export const mbPerAleph = 3

export const defaultVolumeChannel = defaultConsoleChannel
export const defaultSSHChannel = defaultConsoleChannel
export const defaultInstanceChannel = defaultConsoleChannel
export const defaultGpuInstanceChannel = defaultConsoleChannel
export const defaultConfidentialInstanceChannel = defaultConsoleChannel
export const defaultProgramChannel = defaultConsoleChannel
export const defaultDomainChannel = defaultConsoleChannel
export const defaultWebsiteChannel = defaultConsoleChannel

// Aggregate Keys
export const defaultDomainAggregateKey = 'domains'
export const defaultWebsiteAggregateKey = 'websites'
export const defaultPortForwardingAggregateKey = 'port-forwarding'
export const defaultPermissionsAggregateKey = 'security'
export const defaultSSHPostType = 'ALEPH-SSH'

// Wallet Addresses
export const communityWalletAddress =
  '0x5aBd3258C5492fD378EBC2e0017416E199e5Da56'
export const scoringAddress =
  '0x4D52380D3191274a04846c89c069E6C3F2Ed94e4'
export const monitorAddress =
  '0xa1B3bb7d2332383D96b7796B908fB7f7F3c2Be10'
export const senderAddress =
  '0x3a5CC6aBd06B601f4654035d125F9DD2FC992C25'
export const erc20Address =
  '0x27702a26126e0B3702af63Ee09aC4d1A084EF628'
export const splTokenAddress =
  '3UCMiSnkcnkPE1pgQ5ggPCBv6dXgVUy16TmMUe1WpG9x'
export const vouchersAddress =
  '0xB34f25f2c935bCA437C061547eA12851d719dEFb'
export const superToken =
  '0x1290248E01ED2F9f863A9752A8aAD396ef3a1B00'

// URLs
export const crnListProgramUrl = 'https://crns-list.aleph.sh/crns.json'
export const websiteUrl = 'https://www.aleph.cloud'
export const defaultVMURL = 'https://aleph.sh/vm/'
export const programStorageURL = `${DEFAULT_API_SERVER}/api/v0/storage/raw/`

// Payment
export const EXTRA_WEI = 3600 / 10 ** 18

// Enums
export enum EntityType {
  Volume = 'volume',
  Program = 'program',
  Instance = 'instance',
  GpuInstance = 'gpuInstance',
  SSHKey = 'sshKey',
  Domain = 'domain',
  Website = 'website',
  Confidential = 'confidential',
}

export const EntityTypeName: Record<EntityType, string> = {
  [EntityType.Volume]: 'Volume',
  [EntityType.Program]: 'Function',
  [EntityType.Instance]: 'Instance',
  [EntityType.GpuInstance]: 'GPU Instance',
  [EntityType.SSHKey]: 'SSH Key',
  [EntityType.Domain]: 'Domain',
  [EntityType.Website]: 'Website',
  [EntityType.Confidential]: 'Confidential',
}

export enum EntityDomainType {
  IPFS = 'ipfs',
  Program = 'program',
  Instance = 'instance',
  Confidential = 'confidential',
}

export const EntityDomainTypeName: Record<EntityDomainType, string> = {
  [EntityDomainType.IPFS]: 'IPFS',
  [EntityDomainType.Program]: 'Function',
  [EntityDomainType.Instance]: 'Instance',
  [EntityDomainType.Confidential]: 'Confidential',
}

export enum VolumeType {
  New = 'new',
  Existing = 'existing',
  Persistent = 'persistent',
}

export enum PaymentMethod {
  Hold = 'hold',
  Stream = 'stream',
}

type CheckoutAddStepType =
  | 'ssh'
  | 'volume'
  | 'domain'
  | 'stream'
  | 'instance'
  | 'program'
  | 'website'
  | 'reserve'
  | 'allocate'
  | 'portForwarding'
  | 'permissions'

type CheckoutDelStepType =
  | 'sshDel'
  | 'volumeDel'
  | 'domainDel'
  | 'streamDel'
  | 'instanceDel'
  | 'programDel'
  | 'websiteDel'
  | 'portForwardingDel'
  | 'permissionsDel'

type CheckoutUpStepType =
  | 'sshUp'
  | 'volumeUp'
  | 'domainUp'
  | 'instanceUp'
  | 'programUp'
  | 'websiteUp'

export type CheckoutStepType =
  | CheckoutAddStepType
  | CheckoutDelStepType
  | CheckoutUpStepType

export enum WebsiteFrameworkId {
  None = 'none',
  Nextjs = 'nextjs',
  React = 'react',
  Vue = 'vue',
}

export type LanguageType = 'python' | 'javascript' | 'rust' | 'go' | 'c'

export const defaultMimetype: Record<LanguageType, string> = {
  python: 'text/python',
  javascript: 'text/javascript',
  rust: 'text/rust',
  go: 'text/go',
  c: 'text/plain',
}

export const defaultFileExtension: Record<LanguageType, string> = {
  python: 'py',
  javascript: 'js',
  rust: 'rs',
  go: 'go',
  c: 'c',
}

// Blockchain definitions
export { BlockchainId }

export enum ProviderId {
  Reown = 'reown',
}

export type Provider = {
  id: ProviderId
  name: string
}

export const providers: Record<ProviderId, Provider> = {
  [ProviderId.Reown]: {
    id: ProviderId.Reown,
    name: 'Reown',
  },
}

export type BlockchainConfig = {
  id: BlockchainId
  name: string
  chainId: number
  eip155: boolean
  solana: boolean
  currency: string
  explorerUrl?: string
  rpcUrl?: string
}

export const blockchains: Record<string, BlockchainConfig> = {
  [BlockchainId.ETH]: {
    id: BlockchainId.ETH,
    name: 'Ethereum',
    chainId: 1,
    eip155: true,
    solana: false,
    currency: 'ETH',
    explorerUrl: 'https://etherscan.io/',
    rpcUrl: 'https://eth.drpc.org',
  },
  [BlockchainId.AVAX]: {
    id: BlockchainId.AVAX,
    name: 'Avalanche',
    chainId: 43114,
    eip155: true,
    solana: false,
    currency: 'AVAX',
    explorerUrl: 'https://subnets.avax.network/c-chain/',
    rpcUrl: 'https://avalanche.drpc.org',
  },
  [BlockchainId.BASE]: {
    id: BlockchainId.BASE,
    name: 'Base',
    chainId: 8453,
    eip155: true,
    solana: false,
    currency: 'ETH',
    explorerUrl: 'https://basescan.org',
    rpcUrl: 'https://mainnet.base.org',
  },
  [BlockchainId.SOL]: {
    id: BlockchainId.SOL,
    name: 'Solana',
    chainId: 900,
    eip155: false,
    solana: true,
    currency: 'SOL',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://explorer.solana.com/',
  },
}

export const networks: Record<number, BlockchainConfig> = {
  1: blockchains[BlockchainId.ETH]!,
  43114: blockchains[BlockchainId.AVAX]!,
  8453: blockchains[BlockchainId.BASE]!,
  900: blockchains[BlockchainId.SOL]!,
}
