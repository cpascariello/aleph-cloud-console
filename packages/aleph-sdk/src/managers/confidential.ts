import { Account } from '@aleph-sdk/account'
import {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import { SuperfluidAccount } from '@aleph-sdk/superfluid'
import { defaultConfidentialInstanceChannel, EntityType } from '@/constants'
import type { CheckoutStepType } from '@/constants'
import type { InstanceEntity, AddInstance } from '@/types/instance'
import { InstanceManager } from '@/managers/instance'
import type { VolumeManager } from '@/managers/volume'
import type { DomainManager } from '@/managers/domain'
import type { SSHKeyManager } from '@/managers/ssh'
import type { FileManager } from '@/managers/file'
import type { NodeManager } from '@/managers/node'
import type { CostManager } from '@/managers/cost'
import type { ForwardedPortsManager } from '@/managers/forwarded-ports'

export type Confidential = InstanceEntity & {
  type: EntityType.Confidential
}

export class ConfidentialManager extends InstanceManager<Confidential> {
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
    channel = defaultConfidentialInstanceChannel,
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

  override async add(
    newInstance: AddInstance,
    account?: SuperfluidAccount,
  ): Promise<Confidential> {
    // TODO: Implement confidential-specific add logic
    // (trusted execution environment, SEV attestation, etc.)
    return super.add(newInstance, account) as Promise<Confidential>
  }

  override async del(
    entityOrId: string | Confidential,
    account?: SuperfluidAccount,
  ): Promise<void> {
    return super.del(entityOrId, account)
  }

  override async getAddSteps(
    newInstance: AddInstance,
  ): Promise<CheckoutStepType[]> {
    return super.getAddSteps(newInstance)
  }

  override async getDelSteps(
    entityOrIds: string | Confidential | (string | Confidential)[],
  ): Promise<CheckoutStepType[]> {
    return super.getDelSteps(entityOrIds as any)
  }

  override async *delSteps(
    entityOrIds: string | Confidential | (string | Confidential)[],
    account?: SuperfluidAccount,
  ): AsyncGenerator<void> {
    yield* super.delSteps(entityOrIds as any, account)
  }

  protected override parseMessagesFilter({ content }: any): boolean {
    if (content === undefined) return false
    return !!content.environment?.trusted_execution
  }
}
