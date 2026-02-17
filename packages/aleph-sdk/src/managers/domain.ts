import { Account } from '@aleph-sdk/account'
import {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import { AggregateManager } from '@/managers/aggregate'
import type {
  Domain,
  AddDomain,
  DomainAggregateItem,
  DomainStatus,
} from '@/types/domain'
import type { CheckoutStepType } from '@/constants'
import {
  EntityType,
  EntityDomainType,
  defaultDomainAggregateKey,
  defaultDomainChannel,
} from '@/constants'
import { FunctionRuntimeId } from '@/types/runtime'
import Err from '@/errors'

enum DomainCollision {
  throw = 'throw',
  ignore = 'ignore',
  override = 'override',
}

type DomainCollisionType = keyof typeof DomainCollision

export class DomainManager extends AggregateManager<
  Domain,
  AddDomain,
  DomainAggregateItem
> {
  // TODO: Add Zod schemas when schema layer is implemented
  static addSchema = null as any
  static addManySchema = null as any

  protected addStepType: CheckoutStepType = 'domain'
  protected delStepType: CheckoutStepType = 'domainDel'

  constructor(
    protected override account: Account | undefined,
    protected override sdkClient:
      | AlephHttpClient
      | AuthenticatedAlephHttpClient,
    protected override key = defaultDomainAggregateKey,
    protected override channel = defaultDomainChannel,
  ) {
    super(account, sdkClient, key, channel)
  }

  getKeyFromAddEntity(entity: AddDomain): string {
    return entity.name
  }

  buildAggregateItemContent(
    entity: AddDomain,
  ): DomainAggregateItem {
    const { ref, target } = entity
    const isConfidential =
      target === EntityDomainType.Confidential
    const type = isConfidential ? EntityDomainType.Instance : target
    return {
      message_id: ref,
      type,
      programType: type,
      updated_at: new Date().toISOString(),
      ...(type === EntityDomainType.IPFS
        ? {
            options: { catch_all_path: '/404.html' },
          }
        : isConfidential
          ? {
              options: { confidential: true },
            }
          : {}),
    }
  }

  async retry(domain: Domain) {
    const addDomain: AddDomain = {
      name: domain.name,
      target: domain.target,
      ref: domain.ref,
    }

    return super.add(addDomain)
  }

  async updateName(
    domain: Domain,
    newName: string,
  ): Promise<Domain> {
    const content = this.buildAggregateItemContent({
      name: newName,
      target: domain.target,
      ref: domain.ref,
    })

    return super.update(domain.name, newName, content)
  }

  async *updateNameSteps(
    domain: Domain,
    newName: string,
  ): AsyncGenerator<void, Domain, void> {
    const content = this.buildAggregateItemContent({
      name: newName,
      target: domain.target,
      ref: domain.ref,
    })

    return yield* super.updateSteps(domain.name, newName, content)
  }

  override async add(
    domains: AddDomain | AddDomain[],
    onCollision?: DomainCollisionType,
  ): Promise<Domain[]> {
    const parsedDomains = await this.parseDomains(
      Array.isArray(domains) ? domains : [domains],
      onCollision,
    )
    if (!parsedDomains.length) return []

    return super.add(parsedDomains)
  }

  override async *addSteps(
    domains: AddDomain | AddDomain[],
    onCollision?: DomainCollisionType,
  ): AsyncGenerator<void, Domain[], void> {
    const parsedDomains = await this.parseDomains(
      Array.isArray(domains) ? domains : [domains],
      onCollision,
    )
    if (!parsedDomains.length) return []

    return yield* super.addSteps(parsedDomains)
  }

  async checkStatus(domain: Domain): Promise<DomainStatus> {
    if (!this.account) throw Err.InvalidAccount

    const query = await fetch(
      `https://api.dns.public.aleph.sh/domain/check`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: domain.name,
          owner: this.account.address,
          target:
            domain.target === EntityDomainType.Confidential
              ? EntityDomainType.Instance
              : domain.target,
        }),
      },
    )
    const response = await query.json()
    return response
  }

  override async getAddSteps(
    domains: AddDomain | AddDomain[],
    onCollision?: DomainCollisionType,
  ): Promise<CheckoutStepType[]> {
    domains = Array.isArray(domains) ? domains : [domains]

    // Mock ref to bypass schema validation
    domains = domains.map((domain) => ({
      ...domain,
      ref: FunctionRuntimeId.Runtime1,
    }))

    domains = await this.parseDomains(domains, onCollision)

    return domains.length ? ['domain'] : []
  }

  override async *delSteps(
    domainsOrIds: string | Domain | (string | Domain)[],
  ): AsyncGenerator<void> {
    yield* super.delSteps(domainsOrIds)
  }

  parseEntityFromAggregateItem(
    name: string,
    content: DomainAggregateItem,
  ): Partial<Domain> {
    const { message_id, type, updated_at, options } = content
    const target = options?.['confidential']
      ? EntityDomainType.Confidential
      : type
    const ref_path =
      type === EntityDomainType.Program
        ? 'computing/function'
        : type === EntityDomainType.Instance
          ? 'computing/instance'
          : type === EntityDomainType.Confidential
            ? 'computing/confidential'
            : 'storage/volume'
    let date = '-'
    try {
      date =
        updated_at?.slice(0, 19).replace('T', ' ') || '-'
    } catch {
      // Use default date
    }

    return {
      type: EntityType.Domain,
      name,
      target,
      ref: message_id,
      confirmed: true,
      updated_at: date,
      date,
      size: 0,
      refUrl: `/${ref_path}/${message_id}`,
    }
  }

  protected async parseDomains(
    domains: AddDomain[],
    onCollision: DomainCollisionType = DomainCollision.throw,
  ): Promise<AddDomain[]> {
    // TODO: Validate with schema when available
    // domains = await DomainManager.addManySchema.parseAsync(domains)

    if (onCollision === DomainCollision.override) return domains

    const currentDomains = await this.getAll()
    const currentDomainSet = new Set<string>(
      currentDomains.map((d) => d.name),
    )

    if (onCollision === DomainCollision.ignore)
      return domains.filter(
        (domain) => !currentDomainSet.has(domain.name),
      )

    return domains.map((domain: AddDomain) => {
      if (!currentDomainSet.has(domain.name)) return domain
      throw Err.DomainUsed(domain.name)
    })
  }
}
