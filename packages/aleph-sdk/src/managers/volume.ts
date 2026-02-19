import { Account } from '@aleph-sdk/account'
import { MessageType } from '@aleph-sdk/message'
import type {
  MessageCostLine,
  GetMessagesConfiguration,
} from '@aleph-sdk/message'
import {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import type { EntityManager, EntityManagerFetchOptions } from '@/managers/types'
import type {
  Volume,
  AddVolume,
  AddNewVolume,
} from '@/types/volume'
import type { VolumeField } from '@/types/fields'
import type { CostLine, CostSummary } from '@/types/cost'
import type { CheckoutStepType } from '@/constants'
import {
  EntityType,
  VolumeType,
  PaymentMethod,
  defaultVolumeChannel,
  programStorageURL,
} from '@/constants'
import {
  getDate,
  getExplorerURL,
  humanReadableSize,
  downloadBlob,
} from '@/utils'
import Err from '@/errors'
import { FileManager } from '@/managers/file'

export type VolumeCostProps = {
  volume?: Volume | AddVolume
  paymentMethod?: PaymentMethod
}

export type VolumeCost = CostSummary

export class VolumeManager
  implements EntityManager<Volume, AddVolume>
{
  // TODO: Add Zod schemas when schema layer is implemented
  static addSchema = null as any
  static addManySchema = null as any

  static async getVolumeSize(
    volume: Volume | AddVolume,
  ): Promise<number> {
    if (volume.volumeType === VolumeType.New) {
      return FileManager.getFileSize(volume?.file)
    }

    if (volume.volumeType === VolumeType.Existing) {
      return FileManager.getFileSize(volume.refHash)
    }

    return volume.size || 0
  }

  constructor(
    protected account: Account | undefined,
    protected sdkClient:
      | AlephHttpClient
      | AuthenticatedAlephHttpClient,
    protected fileManager: FileManager,
    protected channel = defaultVolumeChannel,
  ) {}

  async getAll(
    opts: EntityManagerFetchOptions = {},
  ): Promise<Volume[]> {
    const {
      ids,
      page,
      pagination = 200,
      addresses = !ids && this.account
        ? [this.account.address]
        : undefined,
      channels = !ids ? [this.channel] : undefined,
    } = opts

    try {
      const config: GetMessagesConfiguration = {
        messageTypes: [MessageType.store],
      }
      if (ids) config.hashes = ids
      if (addresses) config.addresses = addresses
      if (channels) config.channels = channels
      if (page !== undefined) config.page = page
      if (pagination !== undefined) config.pagination = pagination

      const response = await this.sdkClient.getMessages(config)

      return await this.parseMessages(response.messages)
    } catch {
      return []
    }
  }

  async get(id: string): Promise<Volume | undefined> {
    const message = await this.sdkClient.getMessage(id)

    const [entity] = await this.parseMessages([message])
    return entity
  }

  async add(volumes: AddVolume | AddVolume[]): Promise<Volume[]> {
    const steps = this.addSteps(volumes)

    while (true) {
      const { value, done } = await steps.next()
      if (done) return value
    }
  }

  async *addSteps(
    volumes: AddVolume | AddVolume[],
  ): AsyncGenerator<void, Volume[], void> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    volumes = Array.isArray(volumes) ? volumes : [volumes]

    const newVolumes = await this.parseNewVolumes(volumes)
    if (newVolumes.length === 0) return []

    try {
      const { channel: ch } = this

      yield
      const response = await Promise.all(
        newVolumes.map(async ({ file: fileObject }) =>
          (
            this.sdkClient as AuthenticatedAlephHttpClient
          ).createStore({
            channel: ch,
            fileObject,
          }),
        ),
      )

      return await this.parseMessages(response)
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async del(volumeOrId: string | Volume): Promise<void> {
    volumeOrId =
      typeof volumeOrId === 'string' ? volumeOrId : volumeOrId.id

    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    try {
      await this.sdkClient.forget({
        channel: this.channel,
        hashes: [volumeOrId],
      })
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async download(volumeOrId: string | Volume): Promise<void> {
    const volumeId =
      typeof volumeOrId === 'string'
        ? volumeOrId
        : volumeOrId.item_type === 'ipfs'
          ? volumeOrId.id
          : volumeOrId.item_hash

    const filename =
      typeof volumeOrId !== 'string' && 'filename' in volumeOrId
        ? String(volumeOrId.filename)
        : `Volume_${volumeId.slice(-12)}.sqsh`

    const req = await fetch(`${programStorageURL}${volumeId}`)
    const blob = await req.blob()

    return downloadBlob(blob, filename)
  }

  async getAddSteps(
    volumes: AddVolume | AddVolume[],
  ): Promise<CheckoutStepType[]> {
    volumes = Array.isArray(volumes) ? volumes : [volumes]
    const newVolumes = await this.parseNewVolumes(volumes)

    return newVolumes.length ? ['volume'] : []
  }

  async getDelSteps(
    volumesOrIds: string | Volume | (string | Volume)[],
  ): Promise<CheckoutStepType[]> {
    volumesOrIds = Array.isArray(volumesOrIds)
      ? volumesOrIds
      : [volumesOrIds]
    return volumesOrIds.length ? ['volumeDel'] : []
  }

  async *delSteps(
    volumesOrIds: string | Volume | (string | Volume)[],
  ): AsyncGenerator<void> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    volumesOrIds = Array.isArray(volumesOrIds)
      ? volumesOrIds
      : [volumesOrIds]
    if (volumesOrIds.length === 0) return

    try {
      yield
      await Promise.all(
        volumesOrIds.map(
          async (volumeOrId) => await this.del(volumeOrId),
        ),
      )
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async getCost(props: VolumeCostProps): Promise<VolumeCost> {
    let totalCost = Number.POSITIVE_INFINITY

    const { volume, paymentMethod = PaymentMethod.Hold } = props

    const emptyCost = {
      paymentMethod,
      cost: totalCost,
      lines: [],
    }

    if (!volume) return emptyCost

    const volumes = [volume]
    const [newVolume] = await this.parseNewVolumes(volumes)

    if (!newVolume || !newVolume.file) return emptyCost

    // Use a mock account for cost estimation when no account is connected
    const { account } = this
    if (!account) return emptyCost

    const costs =
      await this.sdkClient.storeClient.getEstimatedCost({
        account,
        fileObject: newVolume.file,
      })

    totalCost = Number(costs.cost)

    const lines = this.getCostLines(
      newVolume,
      paymentMethod,
      costs.detail,
    )

    return {
      paymentMethod,
      cost: totalCost,
      lines,
    }
  }

  protected async parseNewVolumes(
    volumes: VolumeField[],
  ): Promise<Required<AddNewVolume>[]> {
    const newVolumes = volumes.filter(
      (volume: VolumeField): volume is Required<AddNewVolume> =>
        volume.volumeType === VolumeType.New && !!volume.file,
    )

    // TODO: Validate with schema when available
    // volumes = await VolumeManager.addManySchema.parseAsync(newVolumes)

    return newVolumes
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async parseMessages(messages: any[]): Promise<Volume[]> {
    const sizesMap = await this.fileManager.getSizesMap()
    return messages
      .filter(({ content }) => content !== undefined)
      .map((message) =>
        this.parseMessage(message, message.content, sizesMap),
      )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected parseMessage(
    message: any,
    content: any,
    sizesMap: Record<string, number>,
  ): Volume {
    return {
      id: message.item_hash,
      ...content,
      type: EntityType.Volume,
      volumeType: VolumeType.Existing,
      url: getExplorerURL({
        hash: message.item_hash,
        chain: message.chain,
        sender: message.sender,
        messageType: message.type,
      }),
      date: getDate(message.time),
      size: sizesMap[message.item_hash],
      confirmed: !!message.confirmed,
    }
  }

  protected getCostLines(
    volume: AddNewVolume,
    paymentMethod: PaymentMethod,
    costDetailLines: MessageCostLine[],
  ): CostLine[] {
    return costDetailLines.map((line) => ({
      id: volume.file?.name || '',
      name: line.name,
      detail: volume?.file?.size
        ? humanReadableSize(volume.file.size)
        : 'Unknown size',
      cost:
        paymentMethod === PaymentMethod.Hold
          ? +line.cost_hold
          : +line.cost_stream,
    }))
  }
}
