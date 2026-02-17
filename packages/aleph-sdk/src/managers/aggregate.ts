import { Account } from '@aleph-sdk/account'
import {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import type { EntityManager } from '@/managers/types'
import type { CheckoutStepType } from '@/constants'
import Err from '@/errors'

export type AggregateContent<T> = Record<string, T | null>

export abstract class AggregateManager<Entity, AddEntity, AggregateItem>
  implements EntityManager<Entity, AddEntity>
{
  protected abstract addStepType: CheckoutStepType
  protected abstract delStepType: CheckoutStepType

  constructor(
    protected account: Account | undefined,
    protected sdkClient:
      | AlephHttpClient
      | AuthenticatedAlephHttpClient,
    protected key: string,
    protected channel: string,
  ) {}

  getEntityId(entity: Entity): string {
    const record = entity as Record<string, unknown>
    return record['id'] as string
  }

  getEntityDate(entity: Entity): string {
    const record = entity as Record<string, unknown>
    return record['date'] as string
  }

  buildAggregateContent(
    entity: AddEntity | AddEntity[],
  ): AggregateContent<AggregateItem> {
    const items = Array.isArray(entity) ? entity : [entity]
    return items.reduce(
      (ac, item) => {
        const key = this.getKeyFromAddEntity(item)
        const content = this.buildAggregateItemContent(item)
        ac[key] = content
        return ac
      },
      {} as AggregateContent<AggregateItem>,
    )
  }

  async getAddSteps(
    _entity?: AddEntity | AddEntity[],
    ..._args: unknown[]
  ): Promise<CheckoutStepType[]> {
    return [this.addStepType]
  }

  async getDelSteps(
    _entity?: string | Entity | (string | Entity)[],
    ..._args: unknown[]
  ): Promise<CheckoutStepType[]> {
    return [this.delStepType]
  }

  async getUpdateSteps(
    _oldKey?: string,
    _newKey?: string,
    _content?: AggregateItem,
    ..._args: unknown[]
  ): Promise<CheckoutStepType[]> {
    return [this.addStepType]
  }

  protected parseAggregateItem(
    key: string,
    content: AggregateItem,
  ): Entity {
    const entityFields = this.parseEntityFromAggregateItem(
      key,
      content,
    )

    const fields = entityFields as Record<string, unknown>
    const hasTimestamps = fields['updated_at'] && fields['date']

    if (!hasTimestamps) {
      const now = new Date().toISOString()
      const date = now.slice(0, 19).replace('T', ' ')

      return {
        id: key,
        updated_at: fields['updated_at'] || date,
        date: fields['date'] || date,
        ...entityFields,
      } as Entity
    }

    return {
      id: key,
      ...entityFields,
    } as Entity
  }

  async getAll(): Promise<Entity[]> {
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

  async get(id: string): Promise<Entity | undefined> {
    const entities = await this.getAll()
    return entities.find(
      (entity) => this.getEntityId(entity) === id,
    )
  }

  async add(entity: AddEntity | AddEntity[]): Promise<Entity[]> {
    const steps = this.addSteps(entity)

    while (true) {
      const { value, done } = await steps.next()
      if (done) return value
    }
  }

  async *addSteps(
    entity: AddEntity | AddEntity[],
  ): AsyncGenerator<void, Entity[], void> {
    if (
      !(this.sdkClient instanceof AuthenticatedAlephHttpClient)
    )
      throw Err.InvalidAccount

    try {
      const content = this.buildAggregateContent(entity)

      yield
      const response = await this.sdkClient.createAggregate({
        key: this.key,
        channel: this.channel,
        content,
      })

      return this.parseNewAggregate(response)
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async del(entityOrId: string | Entity): Promise<void> {
    const id =
      typeof entityOrId === 'string'
        ? entityOrId
        : this.getEntityId(entityOrId)

    const content: AggregateContent<AggregateItem> = {
      [id]: null,
    }

    try {
      if (
        !(this.sdkClient instanceof AuthenticatedAlephHttpClient)
      )
        throw Err.InvalidAccount

      await this.sdkClient.createAggregate({
        key: this.key,
        channel: this.channel,
        content,
      })
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async *delSteps(
    entitiesOrIds: string | Entity | (string | Entity)[],
  ): AsyncGenerator<void> {
    if (
      !(this.sdkClient instanceof AuthenticatedAlephHttpClient)
    )
      throw Err.InvalidAccount

    const items = Array.isArray(entitiesOrIds)
      ? entitiesOrIds
      : [entitiesOrIds]
    if (items.length === 0) return

    try {
      yield
      await this.sdkClient.createAggregate({
        key: this.key,
        channel: this.channel,
        content: items.reduce(
          (ac, cv) => {
            const id =
              typeof cv === 'string' ? cv : this.getEntityId(cv)
            ac[id] = null
            return ac
          },
          {} as AggregateContent<AggregateItem>,
        ),
      })
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async update(
    oldKey: string,
    newKey: string,
    content: AggregateItem,
  ): Promise<Entity> {
    const steps = this.updateSteps(oldKey, newKey, content)

    while (true) {
      const { value, done } = await steps.next()
      if (done) return value
    }
  }

  async *updateSteps(
    oldKey: string,
    newKey: string,
    content: AggregateItem,
  ): AsyncGenerator<void, Entity, void> {
    if (
      !(this.sdkClient instanceof AuthenticatedAlephHttpClient)
    )
      throw Err.InvalidAccount

    try {
      const aggregateContent: AggregateContent<AggregateItem> =
        {}

      if (oldKey !== newKey) {
        aggregateContent[oldKey] = null
      }

      aggregateContent[newKey] = content

      yield
      const response = await this.sdkClient.createAggregate({
        key: this.key,
        channel: this.channel,
        content: aggregateContent,
      })

      const entities = this.parseNewAggregate(response)
      const updatedEntity = entities.find(
        (e) => this.getEntityId(e) === newKey,
      )

      if (!updatedEntity)
        throw Err.RequestFailed('Updated entity not found')

      return updatedEntity
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected parseAggregate(response: any): Entity[] {
    const aggregate =
      response as AggregateContent<AggregateItem>
    return this.parseAggregateItems(aggregate).sort((a, b) =>
      this.getEntityDate(b).localeCompare(
        this.getEntityDate(a),
      ),
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected parseNewAggregate(response: any): Entity[] {
    const aggregate = response.content
      .content as AggregateContent<AggregateItem>

    return this.parseAggregateItems(aggregate)
  }

  protected parseAggregateItems(
    aggregate: AggregateContent<AggregateItem>,
  ): Entity[] {
    return Object.entries(aggregate)
      .filter(([, value]) => value !== null)
      .map(([key, value]) =>
        this.parseAggregateItem(
          key,
          value as AggregateItem,
        ),
      )
  }

  abstract getKeyFromAddEntity(entity: AddEntity): string

  abstract buildAggregateItemContent(
    entity: AddEntity,
  ): AggregateItem

  abstract parseEntityFromAggregateItem(
    key: string,
    content: AggregateItem,
  ): Partial<Entity>
}
