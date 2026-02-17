import type { Account } from '@aleph-sdk/account'
import type { HostRequirements } from '@aleph-sdk/message'
import type {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import { defaultGpuInstanceChannel, EntityType } from '@/constants'
import type { CostSummary } from '@/types/cost'
import type { CRN, CRNSpecs } from '@/types/node'
import type { AddInstance, InstanceEntity } from '@/types/instance'
import { InstanceManager } from '@/managers/instance'
import type { VolumeManager } from '@/managers/volume'
import type { DomainManager } from '@/managers/domain'
import type { SSHKeyManager } from '@/managers/ssh'
import type { FileManager } from '@/managers/file'
import type { NodeManager } from '@/managers/node'
import type { CostManager } from '@/managers/cost'
import type { ForwardedPortsManager } from '@/managers/forwarded-ports'

export type GpuInstance = InstanceEntity & {
  type: EntityType.GpuInstance
}

export type GpuInstanceCostProps = AddInstance
export type GpuInstanceCost = CostSummary

export class GpuInstanceManager extends InstanceManager<GpuInstance> {
  constructor(
    account: Account | undefined,
    sdkClient: AlephHttpClient | AuthenticatedAlephHttpClient,
    volumeManager: VolumeManager,
    domainManager: DomainManager,
    sshKeyManager: SSHKeyManager,
    fileManager: FileManager,
    nodeManager: NodeManager,
    costManager: CostManager,
    forwardedPortsManager: ForwardedPortsManager,
    channel = defaultGpuInstanceChannel,
  ) {
    super(
      account,
      sdkClient,
      volumeManager,
      domainManager,
      sshKeyManager,
      fileManager,
      nodeManager,
      costManager,
      forwardedPortsManager,
      channel,
    )
  }

  override async getCost(
    newInstance: GpuInstanceCostProps,
  ): Promise<GpuInstanceCost> {
    return super.getCost(newInstance, EntityType.GpuInstance)
  }

  protected override parseMessagesFilter({ content }: any): boolean {
    if (content === undefined) return false
    return content.requirements?.gpu?.length > 0
  }

  protected override parseRequirements(
    node?: CRN,
  ): HostRequirements | undefined {
    const requirements = super.parseRequirements(node)

    if (!node) return requirements

    const selectedGpu = (node as unknown as CRNSpecs).gpu
    if (!selectedGpu) return requirements

    return {
      ...requirements,
      gpu: [
        {
          vendor: selectedGpu.vendor,
          device_name: selectedGpu.device_name,
        } as any,
      ],
    }
  }
}
