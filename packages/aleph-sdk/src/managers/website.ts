import { Account } from '@aleph-sdk/account'
import { ItemType } from '@aleph-sdk/message'
import type { MessageCostLine } from '@aleph-sdk/message'
import {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import type { EntityManager } from '@/managers/types'
import type {
  Website,
  AddWebsite,
  WebsiteAggregateItem,
} from '@/types/website'
import type { Volume } from '@/types/volume'
import type { Domain } from '@/types/domain'
import type { DomainField } from '@/types/fields'
import type { CostLine, CostSummary } from '@/types/cost'
import type { CheckoutStepType } from '@/constants'
import {
  EntityType,
  PaymentMethod,
  defaultWebsiteAggregateKey,
  defaultWebsiteChannel,
} from '@/constants'
import { getDate, humanReadableSize } from '@/utils'
import Err from '@/errors'
import { FileManager } from '@/managers/file'
import { VolumeManager } from '@/managers/volume'
import { DomainManager } from '@/managers/domain'

type WebsiteAggregate = Record<string, WebsiteAggregateItem | null>

export type WebsiteFolderField = {
  folder?: File[]
  cid?: string
}

export type WebsiteCostProps = {
  website?: WebsiteFolderField
  paymentMethod?: PaymentMethod
}

export type WebsiteCost = CostSummary

export type HistoryVolumes = Record<string, Volume>

export class WebsiteManager
  implements EntityManager<Website, AddWebsite>
{
  // TODO: Add Zod schemas when schema layer is implemented
  static addSchema = null as any
  static updateCid = null as any

  static async getWebsiteSize(
    props: AddWebsite | WebsiteCostProps,
  ): Promise<number> {
    return FileManager.getFolderSize(props.website?.folder)
  }

  constructor(
    protected account: Account | undefined,
    protected sdkClient:
      | AlephHttpClient
      | AuthenticatedAlephHttpClient,
    protected volumeManager: VolumeManager,
    protected domainManager: DomainManager,
    protected key = defaultWebsiteAggregateKey,
    protected channel = defaultWebsiteChannel,
  ) {}

  async getAll(): Promise<Website[]> {
    if (!this.account) return []

    try {
      const response: Record<string, unknown> =
        await this.sdkClient.fetchAggregate(
          this.account.address,
          this.key,
        )

      return this.parseAggregate(response)
    } catch {
      return []
    }
  }

  async get(id: string): Promise<Website | undefined> {
    const entities = await this.getAll()
    return entities.find((entity) => entity.id === id)
  }

  async add(website: AddWebsite): Promise<Website> {
    const steps = this.addSteps(website)

    while (true) {
      const { value, done } = await steps.next()
      if (done) return value
    }
  }

  async *addSteps(
    newWebsite: AddWebsite,
  ): AsyncGenerator<void, Website, void> {
    const { website, name, tags, framework, domains, ens } =
      await this.parseNewWebsite(newWebsite)

    try {
      if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
        throw Err.InvalidAccount

      // Publish volume
      yield
      const volume = await (
        this.sdkClient as AuthenticatedAlephHttpClient
      ).createStore({
        channel: this.channel,
        fileHash: website.cid as string,
        storageEngine: ItemType.ipfs,
      })
      const volumeEntity = (
        await this.volumeManager.parseMessages([volume])
      )[0]

      // Publish website
      const date = Date.now() / 1000
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content: Record<string, any> = {
        [name]: {
          metadata: {
            name,
            tags,
            framework,
          },
          version: 1,
          volume_id: volume.item_hash,
          ens,
          created_at: date,
          updated_at: date,
        },
      }
      yield
      const websiteEntity =
        await this.sdkClient.createAggregate({
          key: this.key,
          channel: this.channel,
          content,
        })
      const entity = (
        await this.parseNewAggregate(websiteEntity)
      )[0]

      // Publish domains
      if (domains && domains.length > 0)
        yield* this.parseDomainsSteps(volumeEntity!.id, domains)

      return entity!
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async del(websiteOrCid: string | Website): Promise<void> {
    websiteOrCid =
      typeof websiteOrCid === 'string'
        ? websiteOrCid
        : websiteOrCid.id

    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    const content: WebsiteAggregate = {
      [websiteOrCid]: null,
    }

    try {
      await this.sdkClient.createAggregate({
        key: this.key,
        channel: this.channel,
        content,
      })
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async download(_websiteOrId: string | Website): Promise<void> {
    throw Err.MethodNotImplemented
  }

  async getAddSteps(
    newWebsite: AddWebsite,
  ): Promise<CheckoutStepType[]> {
    const steps: CheckoutStepType[] = []
    const valid = await this.parseNewWebsite(newWebsite)
    if (valid) {
      steps.push('volume')
      steps.push('website')
      if (valid.domains && valid.domains.length > 0)
        steps.push('domain')
    }
    return steps
  }

  async getDelSteps(
    websitesOrIds: string | Website | (string | Website)[],
  ): Promise<CheckoutStepType[]> {
    const steps: CheckoutStepType[] = []
    websitesOrIds = Array.isArray(websitesOrIds)
      ? websitesOrIds
      : [websitesOrIds]
    websitesOrIds.forEach(() => {
      steps.push('volumeDel')
      steps.push('websiteDel')
    })
    return steps
  }

  async *delSteps(
    websitesOrIds: string | Website | (string | Website)[],
  ): AsyncGenerator<void> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    websitesOrIds = Array.isArray(websitesOrIds)
      ? websitesOrIds
      : [websitesOrIds]
    if (websitesOrIds.length === 0) return

    try {
      for (const websiteOrId of websitesOrIds) {
        if (typeof websiteOrId !== 'string') {
          yield
          await this.volumeManager.del(
            (websiteOrId as Website).volume_id!,
          )
          // Delete history volumes as well
          if (websiteOrId.volume_history) {
            const uniqueVolumes = Array.from(
              new Set(websiteOrId.volume_history),
            )
            await Promise.all(
              uniqueVolumes.map(
                async (volume_id) =>
                  await this.volumeManager.del(volume_id),
              ),
            )
          }
        }
        yield
        await this.del(websiteOrId)
      }
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async getUpdateSteps(
    cid?: string,
    version?: string,
    domains?: Domain[],
  ): Promise<CheckoutStepType[]> {
    const steps: CheckoutStepType[] = []
    if (!cid && !version) throw Err.MissingVolumeData
    else if (cid) steps.push('volumeUp')
    steps.push('websiteUp')
    if (domains && domains.length > 0) steps.push('domainUp')
    return steps
  }

  async *updateSteps(
    website: Website,
    cid?: string,
    version?: string,
    domains?: Domain[],
    history?: HistoryVolumes,
  ): AsyncGenerator<void, Website, void> {
    try {
      if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
        throw Err.InvalidAccount

      let volumeId = ''
      if (cid) {
        // TODO: Validate CID with schema when available
        // cid = await WebsiteManager.updateCid.parseAsync(cid)

        // Publish volume
        yield
        const volume = await (
          this.sdkClient as AuthenticatedAlephHttpClient
        ).createStore({
          channel: this.channel,
          fileHash: cid,
          storageEngine: ItemType.ipfs,
        })
        const volumeEntity = (
          await this.volumeManager.parseMessages([volume])
        )[0]
        volumeId = volumeEntity!.id
      }
      if (version) {
        // Select volume from history
        const historyIndex =
          website.volume_history?.indexOf(version)
        volumeId =
          historyIndex !== undefined && historyIndex >= 0
            ? version
            : ''
        if (volumeId) await this.volumeManager.get(volumeId)
      }
      if (!volumeId) throw Err.MissingVolumeData

      // Publish website
      const recentHistory =
        (history &&
          Object.fromEntries(
            Object.entries(history).map((item) => [
              item[0],
              item[1].id,
            ]),
          )) ||
        {}
      const date = Date.now() / 1000
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content: Record<string, any> = {
        [website.id]: {
          name: website.name,
          framework: website.framework,
          volume_id: volumeId,
          volume_history: [
            ...(website.volume_history || []),
            website.volume_id,
          ].filter(Boolean),
          created_at: website.date,
          updated_at: date,
          ...recentHistory,
        },
      }
      yield
      const websiteEntity =
        await this.sdkClient.createAggregate({
          key: this.key,
          channel: this.channel,
          content,
        })
      const entity = (
        await this.parseNewAggregate(websiteEntity)
      )[0]

      // Publish domains
      if (domains && domains.length > 0)
        yield* this.parseDomainsSteps(volumeId, domains)

      return entity!
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async getDomains(website: Website): Promise<Domain[]> {
    const domains = await this.domainManager.getAll()
    return domains.filter(
      (domain) => domain.ref === website.volume_id,
    )
  }

  async getHistoryVolumes(
    website?: Website,
  ): Promise<HistoryVolumes | undefined> {
    if (
      website?.volume_history &&
      website.volume_history.length > 0
    ) {
      const historyIds = website.volume_history.slice(0, 10)

      if (historyIds.length > 0) {
        const volumes = await this.volumeManager.getAll({
          ids: historyIds,
          page: 1,
          pagination: 10,
        })
        const result: HistoryVolumes = {}
        for (const id of historyIds) {
          const volume = volumes.find((v) => v.id === id)
          if (volume) {
            result[id] = volume
          }
        }
        return result
      }
    }
  }

  async getCost(props: WebsiteCostProps): Promise<WebsiteCost> {
    let totalCost = Number.POSITIVE_INFINITY

    const { website, paymentMethod = PaymentMethod.Hold } = props

    const emptyCost: WebsiteCost = {
      paymentMethod,
      cost: totalCost,
      lines: [],
    }

    if (!website) return emptyCost
    if (!website.folder) return emptyCost

    const fileObject = new Blob(website.folder)

    const { account } = this
    if (!account) return emptyCost

    const costs =
      await this.sdkClient.storeClient.getEstimatedCost({
        account,
        fileObject,
      })

    totalCost = Number(costs.cost)

    const lines = this.getCostLines(
      fileObject,
      paymentMethod,
      costs.detail,
    )

    return {
      paymentMethod,
      cost: totalCost,
      lines,
    }
  }

  protected getCostLines(
    fileObject: Blob,
    paymentMethod: PaymentMethod,
    costDetailLines: MessageCostLine[],
  ): CostLine[] {
    return costDetailLines.map((line) => ({
      id: 'New website folder',
      name: line.name,
      detail: humanReadableSize(fileObject.size),
      cost:
        paymentMethod === PaymentMethod.Hold
          ? +line.cost_hold
          : +line.cost_stream,
    }))
  }

  protected async parseNewWebsite(
    website: AddWebsite,
  ): Promise<AddWebsite> {
    // TODO: Validate with schema when available
    // return await WebsiteManager.addSchema.parseAsync(website)
    return website
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
      'override',
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async parseNewAggregate(
    response: any,
  ): Promise<Website[]> {
    const websites = response.content
      .content as WebsiteAggregate
    return await this.parseAggregateItems(websites)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async parseAggregate(
    response: any,
  ): Promise<Website[]> {
    return await this.parseAggregateItems(
      response as WebsiteAggregate,
    )
  }

  protected async parseAggregateItems(
    aggregate: WebsiteAggregate,
  ): Promise<Website[]> {
    return Promise.all(
      Object.entries(aggregate)
        .filter(([, value]) => value !== null)
        .map(
          async ([key, value]) =>
            await this.parseAggregateItem(
              key,
              value as WebsiteAggregateItem,
            ),
        ),
    )
  }

  protected async parseAggregateItem(
    name: string,
    content: WebsiteAggregateItem,
  ): Promise<Website> {
    const { framework, volume_id, volume_history, updated_at } =
      content
    const date = getDate(updated_at)
    const website: Website = {
      id: name,
      name,
      type: EntityType.Website,
      framework: framework!,
      updated_at: date,
      date,
      url: `/storage/volume/${volume_id}`,
      size: 0,
      confirmed: true,
    }
    if (volume_id !== undefined) website.volume_id = volume_id
    if (volume_history !== undefined)
      website.volume_history = volume_history
    return website
  }
}
