import { Buffer } from 'buffer'
import type { Account } from '@aleph-sdk/account'
import type { SuperfluidAccount } from '@aleph-sdk/superfluid'
import {
  type CostEstimationMachineVolume,
  type HostRequirements,
  type InstancePublishConfiguration,
  type MachineResources,
  type MachineVolume,
  type MessageCost,
  type MessageCostLine,
  MessageCostType,
  type Payment,
  PaymentType,
  PaymentType as SDKPaymentType,
  VolumePersistence,
} from '@aleph-sdk/message'
import type {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import type { CheckoutStepType, PaymentMethod } from '@/constants'
import {
  BlockchainId,
  EntityType,
  EntityTypeName,
  PaymentMethod as PM,
  VolumeType,
} from '@/constants'
import Err from '@/errors'
import {
  convertByteUnits,
  humanReadableSize,
  round,
  sleep,
  isBlockchainPAYGCompatible,
} from '@/utils'
import type {
  Executable,
  ExecutableStatus,
  ExecutableOperations,
  ExecutableSchedulerAllocation,
  PaymentConfiguration,
  StreamPaymentDetails,
  SignedPublicKeyHeader,
} from '@/types/executable'
import type { CostLine } from '@/types/cost'
import type { CRN, CRNSpecs, NodeLastVersions } from '@/types/node'
import type { Domain } from '@/types/domain'
import type {
  AddExistingVolume,
  AddPersistentVolume,
} from '@/types/volume'
import type {
  EnvVarField,
  ExistingVolumeField,
  InstanceSpecsField,
  NewVolumeField,
  PersistentVolumeField,
  VolumeField,
  DomainField,
} from '@/types/fields'

export type KeyPair = {
  publicKey: JsonWebKey
  privateKey: JsonWebKey
  createdAt: number
}

export type AuthPubKeyToken = {
  pubKeyHeader: SignedPublicKeyHeader
  keyPair: KeyPair
}

export const KEYPAIR_TTL = 1000 * 60 * 60 * 2

export type ExecutableCostProps = (
  | {
      type: EntityType.Instance | EntityType.GpuInstance
      rootfs?: {
        size_mib?: number
      }
    }
  | {
      type: EntityType.Program
      isPersistent: boolean
    }
) & {
  resources?: Partial<MachineResources>
  domains?: Domain[]
  volumes?: CostEstimationMachineVolume[]
}

// Mock values for cost estimation
const mockVolumeRef =
  'cafecafecafecafecafecafecafecafecafecafecafecafecafecafecafecafe'
const mockVolumeMountPath = '/mocked-mount-path'
const mockVolumeName = 'mock-name'

/**
 * Interface for volume manager operations needed by ExecutableManager.
 * Avoids circular dependency on the concrete VolumeManager class.
 */
export interface ExecutableVolumeManager {
  addSteps(
    volumes: VolumeField[],
  ): AsyncGenerator<void, Array<{ id: string }>, void>
}

/**
 * Static methods from VolumeManager needed by ExecutableManager.
 */
export interface ExecutableVolumeManagerStatic {
  getVolumeSize(volume: VolumeField): Promise<number>
}

/**
 * Interface for domain manager operations needed by ExecutableManager.
 */
export interface ExecutableDomainManager {
  addSteps(
    domains: DomainField[],
    onConflict?: string,
  ): AsyncGenerator<void, Domain[], void>
}

/**
 * Interface for node manager operations needed by ExecutableManager.
 */
export interface ExecutableNodeManager {
  getAllCRNsSpecs(): Promise<CRNSpecs[]>
  getLatestCRNVersion(): Promise<NodeLastVersions>
}

/**
 * Normalize a CRN URL by lowercasing and removing trailing slashes.
 */
function normalizeNodeUrl(url: string): string {
  return url?.toLowerCase().replace(/\/$/, '')
}

export abstract class ExecutableManager<T extends Executable> {
  protected static cachedPubKeyToken?: AuthPubKeyToken | undefined

  /**
   * Static method for getting volume sizes.
   * Subclasses should set this to ExecutableManager.getVolumeSize
   * during construction or via a static initializer.
   */
  protected static getVolumeSize: (
    volume: VolumeField,
  ) => Promise<number>

  constructor(
    protected account: Account | undefined,
    protected volumeManager: ExecutableVolumeManager,
    protected domainManager: ExecutableDomainManager,
    protected nodeManager: ExecutableNodeManager,
    protected sdkClient: AlephHttpClient | AuthenticatedAlephHttpClient,
  ) {}

  abstract getDelSteps(
    executableOrIds: string | T | (string | T)[],
  ): Promise<CheckoutStepType[]>

  abstract delSteps(
    executableOrIds: string | T | (string | T)[],
    account?: SuperfluidAccount,
  ): AsyncGenerator<void>

  abstract getStreamPaymentDetails(
    executableOrIds: string | T | (string | T)[],
    account?: Account,
  ): Promise<StreamPaymentDetails | undefined>

  async checkStatus(
    executable: T,
  ): Promise<ExecutableStatus | undefined> {
    const node = await this.getAllocationCRN(executable)
    if (!node) return

    const { address } = node
    if (!address) throw Err.InvalidCRNAddress

    const nodeUrl = normalizeNodeUrl(address)
    const { version, json: response } =
      await this.fetchExecutions(nodeUrl)

    const hash = executable.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const executionStatus = (response as Record<string, any>)[hash]
    if (!executionStatus) return

    const networking = executionStatus['networking']
    if (!networking) return

    if (version === 'v1') {
      const { ipv4, ipv6 } = networking

      return {
        version: 'v1',
        hash,
        ipv4,
        ipv6,
        ipv6Parsed: this.formatVMIPv6Address(ipv6),
        node: node as unknown as CRN,
      }
    } else if (version === 'v2') {
      const {
        host_ipv4: hostIpv4,
        ipv4_network: ipv4,
        ipv4_ip: ipv4Parsed,
        ipv6_network: ipv6,
        ipv6_ip: ipv6Parsed,
        mapped_ports: mappedPorts = {},
      } = networking

      const {
        defined_at: definedAt,
        preparing_at: preparingAt,
        prepared_at: preparedAt,
        starting_at: startingAt,
        started_at: startedAt,
        stopping_at: stoppingAt,
        stopped_at: stoppedAt,
      } = executionStatus['status'] || {}

      return {
        version: 'v2',
        node: node as unknown as CRN,
        hash,
        hostIpv4,
        ipv4,
        ipv4Parsed,
        ipv6,
        ipv6Parsed,
        mappedPorts,
        status: {
          running: executionStatus['running'] || false,
          definedAt,
          preparingAt,
          preparedAt,
          startingAt,
          startedAt,
          stoppingAt,
          stoppedAt,
        },
      }
    }
  }

  async getAllocationCRN(
    executable: T,
  ): Promise<CRNSpecs | undefined> {
    if (executable.payment?.type === PaymentType.superfluid) {
      const { receiver } = executable.payment
      if (!receiver) return

      const nodes = await this.nodeManager.getAllCRNsSpecs()

      let node = nodes.find(
        (n) =>
          n.hash ===
          (executable.requirements as
            | { node?: { node_hash?: string } }
            | undefined)?.node?.node_hash,
      )

      if (node) return node

      node = nodes.find((n) => n.stream_reward === receiver)
      return node
    }

    const query = await fetch(
      `https://scheduler.api.aleph.sh/api/v0/allocation/${executable.id}`,
    )

    if (query.status === 404) return

    const response =
      (await query.json()) as ExecutableSchedulerAllocation

    const { node_id, url } = response.node

    const nodes = await this.nodeManager.getAllCRNsSpecs()

    let node = nodes.find((n) => n.hash === node_id)
    if (node) return node

    node = nodes.find(
      (n) =>
        n.address &&
        normalizeNodeUrl(n.address) ===
          normalizeNodeUrl(url),
    )
    if (node) return node

    const { latest: _latestVersion } =
      await this.nodeManager.getLatestCRNVersion()

    return {
      hash: node_id,
      name: '',
      cpu: 0,
      ram: 0,
      storage: 0,
      address: url,
    }
  }

  async reserveCRNResources(
    node: CRN,
    instanceConfig: InstancePublishConfiguration,
  ): Promise<void> {
    if (!node.address) throw Err.InvalidCRNAddress

    const nodeUrl = normalizeNodeUrl(node.address)
    const url = new URL(`${nodeUrl}/control/reserve_resources`)
    const { hostname: domain, pathname: path } = url

    const { keyPair, pubKeyHeader } =
      await this.getAuthPubKeyToken()

    const signedOperationToken =
      await this.getAuthOperationToken(
        keyPair.privateKey,
        domain,
        path,
      )

    const message =
      await (this.sdkClient as any).instanceClient.getCostComputableMessage(
        instanceConfig,
      )

    let errorMsg = ''

    try {
      const req = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SignedOperation': JSON.stringify(signedOperationToken),
          'X-SignedPubKey': JSON.stringify(pubKeyHeader),
        },
        body: message.item_content,
        mode: 'cors',
      })

      const resp = await req.json()
      if (resp.status === 'reserved') return
    } catch (e) {
      errorMsg = (e as Error).message
    }

    throw Err.InstanceStartupFailed(node.hash, errorMsg)
  }

  async notifyCRNAllocation(
    node: CRN,
    instanceId: string,
    retry: {
      attemps: number
      await: number
    } = {
      attemps: 5,
      await: 1000,
    },
  ): Promise<void> {
    if (!node.address) throw Err.InvalidCRNAddress

    let errorMsg = ''

    for (let i = 0; i < retry.attemps; i++) {
      try {
        const nodeUrl = normalizeNodeUrl(node.address)

        const req = await fetch(
          `${nodeUrl}/control/allocation/notify`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              instance: instanceId,
            }),
          },
        )
        const resp = await req.json()
        if (resp.success) return

        errorMsg = resp.errors[instanceId]
      } catch (e) {
        errorMsg = (e as Error).message
      }

      await sleep(retry.await)
    }

    throw Err.InstanceStartupFailed(node.hash, errorMsg)
  }

  async getKeyPair(): Promise<KeyPair> {
    const kp = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    )

    const publicKey = await crypto.subtle.exportKey(
      'jwk',
      kp.publicKey,
    )
    const privateKey = await crypto.subtle.exportKey(
      'jwk',
      kp.privateKey,
    )
    const createdAt = Date.now()

    return { publicKey, privateKey, createdAt }
  }

  async getAuthPubKeyToken(
    keyPair?: KeyPair,
    domain?: string,
  ): Promise<AuthPubKeyToken> {
    if (!this.account) throw Err.InvalidAccount

    const { cachedPubKeyToken } = ExecutableManager

    if (cachedPubKeyToken) {
      const { payload } = cachedPubKeyToken.pubKeyHeader
      const parsedPayload = Buffer.from(
        payload,
        'hex',
      ).toString('utf-8')
      const { expires, chain } = JSON.parse(parsedPayload)

      const expireTimestamp = new Date(expires).valueOf()

      if (
        chain === this.account.getChain() &&
        expireTimestamp >= Date.now()
      ) {
        return cachedPubKeyToken
      } else {
        ExecutableManager.cachedPubKeyToken = undefined
      }
    }

    keyPair = keyPair || (await this.getKeyPair())

    const { publicKey, createdAt } = keyPair
    const { address } = this.account

    const expires = new Date(
      createdAt + KEYPAIR_TTL,
    ).toISOString()

    const { kty, crv, x, y } = publicKey
    const currentChain = this.account.getChain()

    const rawPayload = {
      alg: 'ECDSA',
      pubkey: { kty, crv, x, y },
      address,
      domain,
      chain: currentChain === 'SOL' ? 'SOL' : 'ETH',
      expires,
    }

    let signature: string
    const payload = Buffer.from(
      JSON.stringify(rawPayload),
    ).toString('hex')

    if (currentChain === 'SOL') {
      const wallet = (this.account as any).wallet
      const encodedMessage = new TextEncoder().encode(payload)

      const signedMessage = await wallet.request({
        method: 'signMessage',
        params: { message: encodedMessage, display: 'hex' },
      })

      signature = Buffer.from(signedMessage.signature).toString(
        'hex',
      )
    } else {
      const wallet = (this.account as any).wallet.provider
        .provider

      signature = await wallet.request({
        method: 'personal_sign',
        params: [payload, address],
      })
    }

    const pubKeyToken = {
      keyPair,
      pubKeyHeader: {
        payload,
        signature,
      },
    }

    ExecutableManager.cachedPubKeyToken = pubKeyToken

    return pubKeyToken
  }

  async sendPostOperation({
    hostname,
    operation,
    vmId,
    requireSignature = true,
  }: {
    operation: ExecutableOperations
    vmId: string
    hostname: string
    requireSignature?: boolean
  }): Promise<Response> {
    const url = new URL(
      hostname + '/control/machine/' + vmId + '/' + operation,
    )

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (requireSignature) {
      const { keyPair, pubKeyHeader } =
        await this.getAuthPubKeyToken()
      const { hostname: domain, pathname: path } = url

      const signedOperationToken =
        await this.getAuthOperationToken(
          keyPair.privateKey,
          domain,
          path,
        )

      headers['X-SignedOperation'] = JSON.stringify(
        signedOperationToken,
      )
      headers['X-SignedPubKey'] = JSON.stringify(pubKeyHeader)
    }

    return fetch(url.toString(), {
      method: 'POST',
      headers,
      mode: 'cors',
    })
  }

  // TODO: subscribeLogs removed - requires WebSocket subscription
  // Placeholder: returns empty async generator
  async *subscribeLogs(_opts: {
    vmId: string
    hostname: string
    abort: Promise<void>
  }): AsyncGenerator<{ type: string; message: string }> {
    // WebSocket subscription not yet implemented in SDK
  }

  async getTotalCostByHash(
    paymentMethod: PaymentMethod | PaymentType,
    hash: string,
  ): Promise<number> {
    const costs = await (
      this.sdkClient as any
    ).instanceClient.getCost(hash)
    return this.parseCost(paymentMethod, Number(costs.cost))
  }

  protected async getAuthOperationToken(
    privateKey: JsonWebKey,
    domain: string,
    path: string,
  ) {
    const encoder = new TextEncoder()

    const [d] = new Date().toISOString().split('Z')
    const time = `${d}+00:00`

    const payload = encoder.encode(
      JSON.stringify({
        time,
        path,
        domain,
        method: 'POST',
      }),
    )

    const importedKey = await crypto.subtle.importKey(
      'jwk',
      privateKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign'],
    )

    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      importedKey,
      payload,
    )

    return {
      payload: Buffer.from(payload).toString('hex'),
      signature: Buffer.from(signature).toString('hex'),
    }
  }

  protected formatVMIPv6Address(ipv6: string): string {
    let newIpv6 = ipv6.replace(/\/\d+$/, '')
    newIpv6 = newIpv6.replace(/0(?!.*0)/, '1')
    return newIpv6
  }

  protected parseEnvVars(
    envVars?: EnvVarField[],
  ): Record<string, string> | undefined {
    if (!envVars || envVars.length === 0) return
    return Object.fromEntries(
      envVars.map(({ name, value }) => [name, value]),
    )
  }

  protected async *parseDomainsSteps(
    ref: string,
    domains?: Omit<DomainField, 'ref'>[],
  ): AsyncGenerator<void, Domain[], void> {
    if (!domains || domains.length === 0) return []

    const parsedDomains = domains.map((domain) => ({
      ...domain,
      ref,
    }))

    return yield* this.domainManager.addSteps(
      parsedDomains,
      'ignore',
    )
  }

  protected async parseVolumesForCostEstimation(
    volumes?: VolumeField | VolumeField[],
  ): Promise<MachineVolume[] | undefined> {
    if (!volumes) return

    const volumeList = Array.isArray(volumes)
      ? volumes
      : [volumes]
    if (volumeList.length === 0) return

    return await Promise.all(
      volumeList.map(async (volume) => {
        switch (volume.volumeType) {
          case VolumeType.New: {
            const vol = volume as NewVolumeField
            const estimated_size_mib =
              await ExecutableManager.getVolumeSize(volume)

            return {
              ref: mockVolumeRef,
              use_latest: vol.useLatest || false,
              mount: vol.mountPath || mockVolumeMountPath,
              estimated_size_mib,
            }
          }
          case VolumeType.Existing: {
            const vol = volume as ExistingVolumeField
            const estimated_size_mib =
              await ExecutableManager.getVolumeSize(volume)

            return {
              ref: vol.refHash || mockVolumeRef,
              use_latest: vol.useLatest || false,
              mount: vol.mountPath || mockVolumeMountPath,
              estimated_size_mib,
            }
          }
          case VolumeType.Persistent: {
            const vol = volume as PersistentVolumeField

            return {
              persistence: VolumePersistence.host,
              name: vol.name || mockVolumeName,
              mount: vol.mountPath || mockVolumeMountPath,
              size_mib: vol.size || 0,
            }
          }
        }
      }),
    )
  }

  protected async *parseVolumesSteps(
    volumes?: VolumeField | VolumeField[],
  ): AsyncGenerator<void, MachineVolume[] | undefined, void> {
    if (!volumes) return

    const volumeList = Array.isArray(volumes)
      ? volumes
      : [volumes]
    if (volumeList.length === 0) return

    const messages = yield* this.volumeManager.addSteps(volumeList)

    const parsedVolumes: (AddExistingVolume | AddPersistentVolume)[] =
      await Promise.all(
        volumeList.map(async (volume, i) => {
          if (volume.volumeType !== VolumeType.New)
            return volume as AddExistingVolume | AddPersistentVolume

          const refHash = messages[i]?.id || mockVolumeRef
          const estimated_size_mib =
            await ExecutableManager.getVolumeSize(volume)

          return {
            ...volume,
            volumeType: VolumeType.Existing,
            refHash,
            estimated_size_mib,
          } as AddExistingVolume
        }),
      )

    return parsedVolumes.map((volume) => {
      if (volume.volumeType === VolumeType.Persistent) {
        const {
          mountPath: mount,
          size: size_mib,
          name,
        } = volume

        return {
          persistence: VolumePersistence.host,
          mount,
          size_mib,
          name,
        }
      }

      const {
        refHash: ref,
        mountPath: mount,
        useLatest: use_latest = false,
        estimated_size_mib,
      } = volume
      return { mount, ref, use_latest, estimated_size_mib }
    }) as MachineVolume[]
  }

  protected parseSpecs(
    specs: InstanceSpecsField,
  ): Omit<MachineResources, 'seconds'> | undefined {
    if (!specs) return

    return {
      vcpus: specs.cpu,
      memory: specs.ram,
    }
  }

  protected parseMetadata(
    name = 'Untitled',
    tags?: string[],
    metadata?: Record<string, unknown>,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = { name }

    if (tags && tags.length > 0) {
      out['tags'] = tags
    }

    return {
      ...metadata,
      ...out,
    }
  }

  protected parsePaymentForCostEstimation(
    payment?: PaymentConfiguration,
  ): Payment {
    if (payment?.type === PM.Stream) {
      return {
        chain: payment.chain,
        type: SDKPaymentType.superfluid,
        receiver: payment.receiver,
      }
    } else {
      return {
        chain:
          payment?.chain || BlockchainId.ETH,
        type: SDKPaymentType.hold,
      }
    }
  }

  protected parsePayment(
    payment?: PaymentConfiguration,
  ): Payment {
    if (!payment)
      return {
        chain: BlockchainId.ETH,
        type: SDKPaymentType.hold,
      }
    if (payment.type === PM.Stream) {
      if (!payment.receiver) throw Err.ReceivedRequired
      if (isBlockchainPAYGCompatible(payment.chain))
        return {
          chain: payment.chain,
          type: SDKPaymentType.superfluid,
          receiver: payment.receiver,
        }
      throw Err.StreamNotSupported
    }
    return {
      chain: payment.chain,
      type: SDKPaymentType.hold,
    }
  }

  protected parseRequirements(
    node?: CRN,
  ): HostRequirements | undefined {
    if (!node || !node.hash) return

    const requirements = {
      node: {
        node_hash: node.hash,
      },
    } as HostRequirements

    if (node.terms_and_conditions)
      requirements.node = {
        ...requirements.node,
        terms_and_conditions: node.terms_and_conditions,
      }

    return requirements
  }

  protected getExecutableCostLines(
    entityProps: ExecutableCostProps,
    costs: MessageCost,
  ): CostLine[] {
    if (!costs) return []

    const detailMap = costs.detail.reduce(
      (ac, cv) => {
        ac[cv.type] = cv
        return ac
      },
      {} as Record<MessageCostType, MessageCostLine>,
    )

    const paymentMethod =
      costs.payment_type === PaymentType.hold
        ? PM.Hold
        : PM.Stream

    const costProp =
      paymentMethod === PM.Hold
        ? 'cost_hold'
        : 'cost_stream'

    const {
      vcpus: cpu = 0,
      memory: ram = 0,
    } = entityProps.resources || {}

    const cpuStr = `${cpu}x86-64bit`

    const ramVal = convertByteUnits(ram, 'MiB', 'GiB')
    const ramStr = `.${ramVal}GB-RAM`

    const baseExecutionCostAmount = Number(
      detailMap[MessageCostType.EXECUTION][costProp],
    )

    const rootfsVolumeCostDetail =
      detailMap[
        MessageCostType.EXECUTION_INSTANCE_VOLUME_ROOTFS
      ]

    const rootfsVolumeCostAmount = rootfsVolumeCostDetail
      ? Number(rootfsVolumeCostDetail[costProp])
      : 0

    const volumeDiscountCostDetail =
      detailMap[MessageCostType.EXECUTION_VOLUME_DISCOUNT]

    const volumeDiscountCostAmount = volumeDiscountCostDetail
      ? Math.abs(
          Number(volumeDiscountCostDetail[costProp]),
        )
      : 0

    let remainingDiscountAmount = volumeDiscountCostAmount

    const rootfsVolumeSize =
      (rootfsVolumeCostDetail &&
        entityProps.type !== EntityType.Program &&
        (entityProps as { rootfs?: { size_mib?: number } })
          .rootfs?.size_mib) ||
      0

    let totalExecutionCost = baseExecutionCostAmount
    let totalExecutionStorageSize = rootfsVolumeSize

    let extraExecutionStorageCost = 0
    let extraExecutionStorageSize = 0

    if (rootfsVolumeCostDetail) {
      const percentExtra =
        1 -
        Math.min(
          round(
            remainingDiscountAmount /
              rootfsVolumeCostAmount,
            18,
          ),
          1,
        )

      const extraCost = round(
        rootfsVolumeCostAmount * percentExtra,
        18,
      )
      const extraStorage = round(
        rootfsVolumeSize * percentExtra,
        0,
      )
      const coveredStorage = rootfsVolumeSize - extraStorage

      totalExecutionCost = baseExecutionCostAmount
      extraExecutionStorageCost = extraCost

      totalExecutionStorageSize = coveredStorage
      extraExecutionStorageSize = extraStorage

      remainingDiscountAmount = Math.max(
        remainingDiscountAmount - rootfsVolumeCostAmount,
        0,
      )
    }

    const storageStr = !totalExecutionStorageSize
      ? ''
      : `.${convertByteUnits(totalExecutionStorageSize, 'MiB', 'GiB')}GB-HDD`

    const detail = `${cpuStr}${ramStr}${storageStr}`

    const executionLines: CostLine[] = [
      {
        id: MessageCostType.EXECUTION,
        name: EntityTypeName[entityProps.type].toUpperCase(),
        detail,
        cost: this.parseCost(
          paymentMethod,
          totalExecutionCost,
        ),
      },
    ]

    if (extraExecutionStorageCost) {
      executionLines.push({
        id: MessageCostType.EXECUTION_INSTANCE_VOLUME_ROOTFS,
        name: 'STORAGE',
        label: 'SYSTEM',
        detail: humanReadableSize(
          extraExecutionStorageSize,
          'MiB',
        ),
        cost: this.parseCost(
          paymentMethod,
          extraExecutionStorageCost,
        ),
      })
    }

    const volumesMap = (entityProps.volumes || []).reduce(
      (ac, cv) => {
        ac[cv.mount] = cv
        return ac
      },
      {} as Record<string, CostEstimationMachineVolume>,
    )

    const programVolumeLines: CostLine[] = []
    if (entityProps.type === EntityType.Program) {
      const codeVolumeCostDetail =
        detailMap[
          MessageCostType.EXECUTION_PROGRAM_VOLUME_CODE
        ]
      if (codeVolumeCostDetail) {
        let volumeCost = Number(
          codeVolumeCostDetail[costProp],
        )

        if (remainingDiscountAmount > 0) {
          if (remainingDiscountAmount >= volumeCost) {
            remainingDiscountAmount -= volumeCost
            volumeCost = 0
          } else {
            volumeCost -= remainingDiscountAmount
            remainingDiscountAmount = 0
          }
        }

        programVolumeLines.push({
          id: MessageCostType.EXECUTION_PROGRAM_VOLUME_CODE,
          name: 'STORAGE',
          label: 'CODE',
          detail: 'Code volume',
          cost: this.parseCost(paymentMethod, volumeCost),
        })
      }

      const runtimeVolumeCostDetail =
        detailMap[
          MessageCostType.EXECUTION_PROGRAM_VOLUME_RUNTIME
        ]
      if (runtimeVolumeCostDetail) {
        let volumeCost = Number(
          runtimeVolumeCostDetail[costProp],
        )

        if (remainingDiscountAmount > 0) {
          if (remainingDiscountAmount >= volumeCost) {
            remainingDiscountAmount -= volumeCost
            volumeCost = 0
          } else {
            volumeCost -= remainingDiscountAmount
            remainingDiscountAmount = 0
          }
        }

        programVolumeLines.push({
          id: MessageCostType.EXECUTION_PROGRAM_VOLUME_RUNTIME,
          name: 'STORAGE',
          label: 'RUNTIME',
          detail: 'Runtime volume',
          cost: this.parseCost(paymentMethod, volumeCost),
        })
      }
    }

    const volumesLines: CostLine[] = costs.detail
      .filter(
        (d) =>
          d.type ===
            MessageCostType.EXECUTION_VOLUME_INMUTABLE ||
          d.type ===
            MessageCostType.EXECUTION_VOLUME_PERSISTENT,
      )
      .map((d) => {
        const [, mount] = d.name.split(':')
        const vol = volumesMap[mount!]!
        const size =
          'size_mib' in vol
            ? vol.size_mib
            : vol.estimated_size_mib
        const label =
          'size_mib' in vol ? 'PERSISTENT' : 'VOLUME'

        let volumeCost = Number(d[costProp])

        if (
          entityProps.type === EntityType.Program &&
          remainingDiscountAmount > 0
        ) {
          if (remainingDiscountAmount >= volumeCost) {
            remainingDiscountAmount -= volumeCost
            volumeCost = 0
          } else {
            volumeCost -= remainingDiscountAmount
            remainingDiscountAmount = 0
          }
        }

        return {
          id: `${d.type}|${d.name}`,
          name: 'STORAGE',
          label,
          detail: humanReadableSize(size, 'MiB'),
          cost: this.parseCost(paymentMethod, volumeCost),
        }
      })

    const programTypeLines: CostLine[] =
      entityProps.type === EntityType.Program
        ? [
            {
              id: 'PROGRAM_TYPE',
              name: 'TYPE',
              detail: (entityProps as { isPersistent: boolean })
                .isPersistent
                ? 'persistent'
                : 'on-demand',
              cost: this.parseCost(paymentMethod, 0),
            },
          ]
        : []

    const domainsLines: CostLine[] = (
      entityProps.domains || []
    ).map((domain) => ({
      id: 'DOMAIN',
      name: 'CUSTOM DOMAIN',
      detail: domain.name,
      cost: this.parseCost(paymentMethod, 0),
    }))

    return [
      ...executionLines,
      ...programVolumeLines,
      ...volumesLines,
      ...programTypeLines,
      ...domainsLines,
    ]
  }

  protected parseCost(
    paymentMethod: PaymentMethod | PaymentType,
    cost: number,
  ) {
    return paymentMethod === PM.Hold ? cost : cost * 3600
  }

  protected async fetchExecutions(
    nodeUrl: string,
    init?: RequestInit,
  ): Promise<{ version: 'v1' | 'v2'; json: unknown }> {
    try {
      const res = await fetch(
        `${nodeUrl}/v2/about/executions/list`,
        init,
      )

      if (res.ok)
        return { version: 'v2', json: await res.json() }

      if (res.status === 404 || res.status === 405)
        throw new Error('Execution list v2 Not found')

      throw new Error(
        `Execution list v2 failed: ${res.status}`,
      )
    } catch {
      const res = await fetch(
        `${nodeUrl}/about/executions/list`,
        init,
      )

      if (!res.ok)
        throw new Error(
          `Execution list v1 failed: ${res.status}`,
        )

      return { version: 'v1', json: await res.json() }
    }
  }
}
