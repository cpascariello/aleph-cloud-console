import type { Account } from '@aleph-sdk/account'
import {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import { DEFAULT_API_SERVER } from '@/constants'
import { FileManager } from '@/managers/file'
import { MessageManager } from '@/managers/message'
import { SSHKeyManager } from '@/managers/ssh'
import { DomainManager } from '@/managers/domain'
import { VolumeManager } from '@/managers/volume'
import { CostManager } from '@/managers/cost'
import { NodeManager } from '@/managers/node'
import { ForwardedPortsManager } from '@/managers/forwarded-ports'
import { InstanceManager } from '@/managers/instance'
import { GpuInstanceManager } from '@/managers/gpu-instance'
import { ConfidentialManager } from '@/managers/confidential'
import { ProgramManager } from '@/managers/program'
import { WebsiteManager } from '@/managers/website'

export interface AlephManagers {
  sdkClient: AlephHttpClient | AuthenticatedAlephHttpClient
  fileManager: FileManager
  messageManager: MessageManager
  sshKeyManager: SSHKeyManager
  domainManager: DomainManager
  volumeManager: VolumeManager
  costManager: CostManager
  nodeManager: NodeManager
  forwardedPortsManager: ForwardedPortsManager
  instanceManager: InstanceManager
  gpuInstanceManager: GpuInstanceManager
  confidentialManager: ConfidentialManager
  programManager: ProgramManager
  websiteManager: WebsiteManager
}

export function createManagers(
  account?: Account,
  apiServer = DEFAULT_API_SERVER,
): AlephManagers {
  const sdkClient = !account
    ? new AlephHttpClient(apiServer)
    : new AuthenticatedAlephHttpClient(account, apiServer)

  // Foundation managers (no dependencies on other managers)
  const fileManager = new FileManager(
    account,
    undefined,
    sdkClient,
  )
  const messageManager = new MessageManager(
    account,
    sdkClient,
  )
  const costManager = new CostManager(sdkClient)
  const nodeManager = new NodeManager(
    fileManager,
    sdkClient,
    account,
    undefined,
    apiServer,
  )
  const sshKeyManager = new SSHKeyManager(
    account,
    sdkClient,
  )
  const domainManager = new DomainManager(
    account,
    sdkClient,
  )
  const volumeManager = new VolumeManager(
    account,
    sdkClient,
    fileManager,
  )
  const forwardedPortsManager = new ForwardedPortsManager(
    account,
    sdkClient,
  )

  // Compute managers (depend on foundation managers)
  const instanceManager = new InstanceManager(
    account,
    sdkClient,
    volumeManager,
    domainManager,
    sshKeyManager,
    fileManager,
    nodeManager,
    costManager,
    forwardedPortsManager,
  )
  const gpuInstanceManager = new GpuInstanceManager(
    account,
    sdkClient,
    volumeManager,
    domainManager,
    sshKeyManager,
    fileManager,
    nodeManager,
    costManager,
    forwardedPortsManager,
  )
  const confidentialManager = new ConfidentialManager(
    account,
    sdkClient,
    volumeManager,
    domainManager,
    sshKeyManager,
    fileManager,
    nodeManager,
    costManager,
    forwardedPortsManager,
  )
  const programManager = new ProgramManager(
    account,
    sdkClient,
    volumeManager,
    domainManager,
    messageManager,
    fileManager,
    nodeManager,
  )
  const websiteManager = new WebsiteManager(
    account,
    sdkClient,
    volumeManager,
    domainManager,
  )

  return {
    sdkClient,
    fileManager,
    messageManager,
    sshKeyManager,
    domainManager,
    volumeManager,
    costManager,
    nodeManager,
    forwardedPortsManager,
    instanceManager,
    gpuInstanceManager,
    confidentialManager,
    programManager,
    websiteManager,
  }
}
