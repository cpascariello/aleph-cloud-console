import type { Account } from '@aleph-sdk/account'
import { createFromEVMAccount, SuperfluidAccount } from '@aleph-sdk/superfluid'
import type {
  InstancePublishConfiguration,
  RootfsVolumeConfiguration,
} from '@aleph-sdk/message'
import { MessageType, PaymentType } from '@aleph-sdk/message'
import {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import type { EVMAccount } from '@aleph-sdk/evm'
import {
  defaultInstanceChannel,
  EntityType,
  EXTRA_WEI,
  PaymentMethod,
} from '@/constants'
import type { CheckoutStepType } from '@/constants'
import Err from '@/errors'
import { getDate, getExplorerURL, getHours } from '@/utils'
import { ExecutableManager } from '@/managers/executable'
import type { EntityManager } from '@/managers/types'
import type { VolumeManager } from '@/managers/volume'
import type { DomainManager } from '@/managers/domain'
import type { SSHKeyManager } from '@/managers/ssh'
import type { FileManager } from '@/managers/file'
import type { NodeManager } from '@/managers/node'
import type { CostManager } from '@/managers/cost'
import type { ForwardedPortsManager } from '@/managers/forwarded-ports'
import type {
  AddInstance,
  Instance,
  InstanceEntity,
  InstanceCostProps,
  InstanceCost,
} from '@/types/instance'
import type {
  StreamPaymentDetails,
  StreamPaymentDetail,
} from '@/types/executable'
import type {
  SSHKeyField,
  InstanceImageField,
  InstanceSystemVolumeField,
} from '@/types/fields'

// Mock account for cost estimation (no real key needed)
import { ETHAccount } from '@aleph-sdk/ethereum'
const mockAccount = new ETHAccount(
  null as any,
  '0xcafecafecafecafecafecafecafecafecafecafe',
)

export class InstanceManager<T extends InstanceEntity = Instance>
  extends ExecutableManager<T>
  implements EntityManager<T, AddInstance>
{
  // TODO: Schema validation placeholder
  static addSchema = null as any
  static addStreamSchema = null as any

  constructor(
    protected override account: Account | undefined,
    protected override sdkClient: AlephHttpClient | AuthenticatedAlephHttpClient,
    protected override volumeManager: VolumeManager,
    protected override domainManager: DomainManager,
    protected sshKeyManager: SSHKeyManager,
    protected fileManager: FileManager,
    protected override nodeManager: NodeManager,
    protected costManager: CostManager,
    protected forwardedPortsManager: ForwardedPortsManager,
    protected channel = defaultInstanceChannel,
  ) {
    super(account, volumeManager as any, domainManager as any, nodeManager as any, sdkClient)
  }

  async getAll(): Promise<T[]> {
    if (!this.account) return []

    try {
      const response = await this.sdkClient.getMessages({
        addresses: [this.account.address],
        messageTypes: [MessageType.instance],
        channels: [this.channel],
        pagination: 200,
      })

      return await this.parseMessages(response.messages)
    } catch {
      return []
    }
  }

  async get(id: string): Promise<T | undefined> {
    const message = await this.sdkClient.getMessage(id)
    const [entity] = await this.parseMessages([message])
    return entity
  }

  async add(
    newInstance: AddInstance,
    account?: SuperfluidAccount,
  ): Promise<T> {
    const steps = this.addSteps(newInstance, account)

    while (true) {
      const { value, done } = await steps.next()
      if (done) return value
    }
  }

  async *addSteps(
    newInstance: AddInstance,
    account?: SuperfluidAccount,
  ): AsyncGenerator<void, T, void> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    try {
      const instanceMessage = yield* this.parseInstanceSteps(newInstance)

      yield
      const response = await this.sdkClient.createInstance({
        ...instanceMessage,
      })
      const [entity] = await this.parseMessages([response])
      if (!entity) throw Err.RequestFailed('Failed to parse instance message')

      yield* this.addPAYGStreamSteps(newInstance, account)
      yield* this.parseDomainsSteps(entity.id, newInstance.domains)
      yield* this.addPAYGAllocationSteps(newInstance, entity as InstanceEntity)

      return entity
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async delStreams(
    instanceOrId: string | T,
    account?: SuperfluidAccount,
  ): Promise<void> {
    const instance = await this.ensureInstance(instanceOrId)
    if (instance.payment?.type !== PaymentType.superfluid) return

    if (!account) throw Err.ConnectYourPaymentWallet
    const { receiver } = instance.payment
    if (!receiver) throw Err.ReceiverReward

    const { communityWalletAddress, communityWalletTimestamp } =
      await this.costManager.getSettingsAggregate()

    const instanceCosts = await this.getTotalCostByHash(
      instance.payment?.type,
      instance.id,
    )

    const results = await Promise.allSettled(
      instance.time >= communityWalletTimestamp
        ? [
            account.decreaseALEPHFlow(
              receiver,
              this.calculateReceiverFlow(instanceCosts) + EXTRA_WEI,
            ),
            account.decreaseALEPHFlow(
              communityWalletAddress,
              this.calculateCommunityFlow(instanceCosts) + EXTRA_WEI,
            ),
          ]
        : [
            account.decreaseALEPHFlow(
              receiver,
              instanceCosts + EXTRA_WEI,
            ),
          ],
    )

    const errors: Error[] = results
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      )
      .filter(({ reason }) => reason.message !== 'No flow to decrease flow')
      .map(({ reason }) => new Error(reason.message))

    if (errors.length) {
      const [firstError] = errors
      throw firstError
    }
  }

  async delInstance(instanceOrId: string | T): Promise<void> {
    const instance = await this.ensureInstance(instanceOrId)

    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    await this.sdkClient.forget({
      channel: this.channel,
      hashes: [instance.id],
    })
  }

  async del(
    instanceOrId: string | T,
    account?: SuperfluidAccount,
  ): Promise<void> {
    try {
      const instance = await this.ensureInstance(instanceOrId)

      await this.delStreams(instance, account)
      await this.delInstance(instance)

      try {
        await this.forwardedPortsManager.delByEntityHash(instance.id)
      } catch (err) {
        console.error('Failed to remove forwarded ports for instance:', err)
      }
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async getAddSteps(newInstance: AddInstance): Promise<CheckoutStepType[]> {
    const steps: CheckoutStepType[] = []
    const { sshKeys, volumes = [], domains = [] } = newInstance

    const newKeys = this.parseNewSSHKeys(sshKeys)
    if (newKeys.length > 0) steps.push('ssh')
    if (volumes.length > 0) steps.push('volume')

    steps.push('instance')

    if (newInstance.payment?.type === PaymentMethod.Stream) {
      steps.push('stream')
    }

    if (domains.length > 0) steps.push('domain')

    if (newInstance.payment?.type === PaymentMethod.Stream) {
      steps.push('allocate')
    }

    return steps
  }

  async getDelSteps(
    instancesOrIds: string | T | (string | T)[],
  ): Promise<CheckoutStepType[]> {
    const steps: CheckoutStepType[] = []

    instancesOrIds = Array.isArray(instancesOrIds)
      ? instancesOrIds
      : [instancesOrIds]

    await Promise.all(
      instancesOrIds.map(async (instanceOrId) => {
        const instance = await this.ensureInstance(instanceOrId)

        if (instance.payment?.type === PaymentType.superfluid) {
          steps.push('streamDel')
        }

        steps.push('instanceDel')
        steps.push('portForwardingDel')
      }),
    )

    return steps
  }

  async *delSteps(
    instancesOrIds: string | T | (string | T)[],
    account?: SuperfluidAccount,
  ): AsyncGenerator<void> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    instancesOrIds = Array.isArray(instancesOrIds)
      ? instancesOrIds
      : [instancesOrIds]
    if (instancesOrIds.length === 0) return

    try {
      for (const instanceOrId of instancesOrIds) {
        const instance = await this.ensureInstance(instanceOrId)

        if (instance.payment?.type === PaymentType.superfluid) {
          yield
          await this.delStreams(instance, account)
        }

        yield
        await this.delInstance(instance)

        yield
        try {
          await this.forwardedPortsManager.delByEntityHash(instance.id)
        } catch (err) {
          console.error('Failed to remove forwarded ports for instance:', err)
        }
      }
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async getCost(
    newInstance: InstanceCostProps,
    entityType:
      | EntityType.Instance
      | EntityType.GpuInstance = EntityType.Instance,
  ): Promise<InstanceCost> {
    let totalCost = Number.POSITIVE_INFINITY
    const paymentMethod = newInstance.payment?.type || PaymentMethod.Hold

    const parsedInstance: InstancePublishConfiguration =
      await this.parseInstanceForCostEstimation(newInstance)

    const costs =
      await (this.sdkClient as any).instanceClient.getEstimatedCost(parsedInstance)

    totalCost = Number(costs.cost)

    const lines = this.getExecutableCostLines(
      {
        type: entityType,
        ...parsedInstance,
      },
      costs,
    )

    return {
      cost: this.parseCost(paymentMethod, totalCost),
      paymentMethod,
      lines: [...lines],
    }
  }

  async getStreamPaymentDetails(
    instanceOrId: string | T,
    accountOrSuperfluidAccount?: Account | SuperfluidAccount,
  ): Promise<StreamPaymentDetails | undefined> {
    const instance = await this.ensureInstance(instanceOrId)
    if (instance.payment?.type !== PaymentType.superfluid) return

    if (!accountOrSuperfluidAccount) throw Err.ConnectYourPaymentWallet

    const sfAccount =
      accountOrSuperfluidAccount instanceof SuperfluidAccount
        ? accountOrSuperfluidAccount
        : await createFromEVMAccount(
            accountOrSuperfluidAccount as EVMAccount,
          ).catch(() => undefined)

    if (!sfAccount) {
      return {} as StreamPaymentDetails
    }

    const { receiver } = instance.payment
    if (!receiver) throw Err.ReceiverReward

    const { communityWalletAddress, communityWalletTimestamp } =
      await this.costManager.getSettingsAggregate()

    const instanceCosts = await this.getTotalCostByHash(
      instance.payment?.type,
      instance.id,
    )

    const mainFlow = await sfAccount
      .getALEPHFlow(receiver)
      .catch(() => undefined)
    const isMainFlowActive = mainFlow && mainFlow.gt(0)
    const sender = sfAccount.address

    let senderToReceiver: StreamPaymentDetail | undefined
    let senderToCommunity: StreamPaymentDetail | undefined

    if (instance.time >= communityWalletTimestamp) {
      const communityFlow = await sfAccount
        .getALEPHFlow(communityWalletAddress)
        .catch(() => undefined)

      const isCommunityFlowActive =
        communityFlow && communityFlow.gt(0)

      if (isMainFlowActive) {
        senderToReceiver = {
          sender,
          receiver,
          flowRate: BigInt(
            Math.floor(
              (this.calculateReceiverFlow(instanceCosts) + EXTRA_WEI) *
                10 ** 18,
            ),
          ),
          lastUpdated: Date.now(),
        }
      }

      if (isCommunityFlowActive) {
        senderToCommunity = {
          sender,
          receiver: communityWalletAddress,
          flowRate: BigInt(
            Math.floor(
              (this.calculateCommunityFlow(instanceCosts) + EXTRA_WEI) *
                10 ** 18,
            ),
          ),
          lastUpdated: Date.now(),
        }
      }
    } else {
      if (isMainFlowActive) {
        senderToReceiver = {
          sender,
          receiver,
          flowRate: BigInt(
            Math.floor((instanceCosts + EXTRA_WEI) * 10 ** 18),
          ),
          lastUpdated: Date.now(),
        }
      }
    }

    const result: StreamPaymentDetails = {} as StreamPaymentDetails
    if (senderToReceiver) result.senderToReceiver = senderToReceiver
    if (senderToCommunity) result.senderToCommunity = senderToCommunity
    return result
  }

  protected async ensureInstance(instanceOrId: string | T): Promise<T> {
    let instance: T | undefined

    if (typeof instanceOrId !== 'string') {
      instance = instanceOrId
      instanceOrId = instance.id
    } else {
      instance = await this.get(instanceOrId)
    }

    if (!instance) throw Err.InstanceNotFound
    return instance
  }

  protected async *addPAYGStreamSteps(
    newInstance: AddInstance,
    account?: SuperfluidAccount,
  ): AsyncGenerator<void, void, void> {
    if (newInstance.payment?.type !== PaymentMethod.Stream) return
    if (!newInstance.node || !newInstance.node.address) throw Err.InvalidNode
    if (!account) throw Err.ConnectYourWallet

    const { streamCost, streamDuration, receiver } =
      newInstance.payment as any

    const { communityWalletAddress } =
      await this.costManager.getSettingsAggregate()

    const costByHour = streamCost / getHours(streamDuration)
    const streamCostByHourToReceiver =
      this.calculateReceiverFlow(costByHour)
    const streamCostByHourToCommunity =
      this.calculateCommunityFlow(costByHour)

    const alephxBalance = await account.getALEPHBalance()
    const recieverAlephxFlow = await account.getALEPHFlow(receiver)
    const communityAlephxFlow = await account.getALEPHFlow(
      communityWalletAddress,
    )

    const receiverTotalFlow = recieverAlephxFlow.add(
      streamCostByHourToReceiver,
    )
    const communityTotalFlow = communityAlephxFlow.add(
      streamCostByHourToCommunity,
    )

    if (
      receiverTotalFlow.greaterThan(100) ||
      communityTotalFlow.greaterThan(100)
    )
      throw Err.MaxFlowRate

    const totalAlephxFlow = recieverAlephxFlow.add(communityAlephxFlow)
    const usedAlephInDuration = totalAlephxFlow.mul(
      getHours(streamDuration),
    )
    const totalRequiredAleph = usedAlephInDuration.add(streamCost)

    if (alephxBalance.lt(totalRequiredAleph))
      throw Err.InsufficientBalance(
        totalRequiredAleph.sub(alephxBalance).toNumber(),
      )

    yield

    await account.increaseALEPHFlow(
      communityWalletAddress,
      streamCostByHourToCommunity + EXTRA_WEI,
    )
    await account.increaseALEPHFlow(
      receiver,
      streamCostByHourToReceiver + EXTRA_WEI,
    )
  }

  protected async *addPAYGAllocationSteps(
    newInstance: AddInstance,
    entity: InstanceEntity,
  ): AsyncGenerator<void, void, void> {
    if (newInstance.payment?.type !== PaymentMethod.Stream) return
    if (!newInstance.node || !newInstance.node.address) throw Err.InvalidNode

    yield
    await this.notifyCRNAllocation(
      newInstance.node as any,
      entity.id,
      {
        attemps: 10,
        await: 2000,
      },
    )
  }

  protected async parseInstanceForCostEstimation(
    newInstance: AddInstance,
  ): Promise<InstancePublishConfiguration> {
    const account = this.account || mockAccount
    const { channel } = this
    const { specs, image, node, systemVolume } = newInstance

    const rootfs = this.parseRootfs(image, systemVolume)
    const resources = this.parseSpecs(specs)
    const requirements = this.parseRequirements(node as any)
    const payment = this.parsePaymentForCostEstimation(newInstance.payment)
    const volumes = await this.parseVolumesForCostEstimation(
      newInstance.volumes,
    )

    return {
      account,
      channel,
      ...(resources ? { resources } : {}),
      rootfs,
      ...(volumes ? { volumes } : {}),
      payment,
      ...(requirements ? { requirements } : {}),
    } as InstancePublishConfiguration
  }

  protected parseRootfs(
    image: InstanceImageField,
    systemVolume: InstanceSystemVolumeField,
  ): RootfsVolumeConfiguration {
    return {
      parent: { ref: image },
      size_mib: systemVolume.size,
    }
  }

  protected async *parseInstanceSteps(
    newInstance: AddInstance,
  ): AsyncGenerator<void, InstancePublishConfiguration, void> {
    if (!this.account) throw Err.InvalidAccount

    const schema = !newInstance.node
      ? InstanceManager.addSchema
      : InstanceManager.addStreamSchema

    // TODO: Schema validation - schemas set to null as any for now
    if (schema) {
      newInstance = await schema.parseAsync(newInstance)
    }

    const { account, channel } = this

    const {
      envVars,
      specs,
      image,
      sshKeys,
      name,
      tags,
      node,
      systemVolume,
    } = newInstance

    const rootfs = this.parseRootfs(image, systemVolume)
    const variables = this.parseEnvVars(envVars)
    const resources = this.parseSpecs(specs)
    const metadata = this.parseMetadata(name, tags)
    const requirements = this.parseRequirements(node as any)
    const payment = this.parsePayment(newInstance.payment)
    const authorized_keys = yield* this.parseSSHKeysSteps(sshKeys)
    const volumes = yield* this.parseVolumesSteps(newInstance.volumes)

    return {
      account,
      channel,
      ...(variables ? { variables } : {}),
      ...(resources ? { resources } : {}),
      metadata,
      rootfs,
      ...(authorized_keys ? { authorized_keys } : {}),
      ...(volumes ? { volumes } : {}),
      payment,
      ...(requirements ? { requirements } : {}),
    } as InstancePublishConfiguration
  }

  protected async *parseSSHKeysSteps(
    sshKeys?: SSHKeyField[],
  ): AsyncGenerator<void, string[] | undefined, void> {
    const newKeys = this.parseNewSSHKeys(sshKeys)
    yield* this.sshKeyManager.addSteps(newKeys, false)

    return sshKeys?.filter((key) => key.isSelected).map(({ key }) => key)
  }

  protected parseNewSSHKeys(sshKeys?: SSHKeyField[]): SSHKeyField[] {
    return sshKeys?.filter((key) => key.isNew && key.isSelected) || []
  }

  protected async parseMessages(messages: any[]): Promise<T[]> {
    return messages.filter(this.parseMessagesFilter).map((message) => {
      return {
        id: message.item_hash,
        ...message.content,
        name: message.content.metadata?.name || 'Unnamed instance',
        type: EntityType.Instance,
        url: getExplorerURL({
          hash: message.item_hash,
          chain: message.chain,
          sender: message.sender,
          messageType: message.type,
        }),
        date: getDate(message.time),
        size: message.content.rootfs?.size_mib || 0,
        confirmed: !!message.confirmed,
      } as T
    })
  }

  protected parseMessagesFilter({ content }: any): boolean {
    if (content === undefined) return false
    if (content.environment?.trusted_execution) return false
    if (content.requirements?.gpu?.length > 0) return false
    return true
  }

  protected calculateCommunityFlow(streamCost: number): number {
    return streamCost * 0.2
  }

  protected calculateReceiverFlow(streamCost: number): number {
    return streamCost * 0.8
  }
}
