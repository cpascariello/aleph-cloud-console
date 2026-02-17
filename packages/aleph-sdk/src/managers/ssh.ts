import { Account } from '@aleph-sdk/account'
import {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import type { EntityManager } from '@/managers/types'
import type { SSHKey, AddSSHKey } from '@/types/ssh'
import type { CheckoutStepType } from '@/constants'
import { EntityType, defaultSSHPostType, defaultSSHChannel } from '@/constants'
import { convertByteUnits, getDate, getExplorerURL } from '@/utils'
import Err from '@/errors'

export class SSHKeyManager implements EntityManager<SSHKey, AddSSHKey> {
  // TODO: Add Zod schemas when schema layer is implemented
  static addSchema = null as any
  static addManySchema = null as any

  constructor(
    protected account: Account | undefined,
    protected sdkClient: AlephHttpClient | AuthenticatedAlephHttpClient,
    protected type = defaultSSHPostType,
    protected channel = defaultSSHChannel,
  ) {}

  async getAll(): Promise<SSHKey[]> {
    if (!this.account) return []

    try {
      const response = await this.sdkClient.getPosts({
        addresses: [this.account.address],
        types: this.type,
        channels: [this.channel],
      })

      return this.parsePosts(response.posts)
    } catch {
      return []
    }
  }

  async get(id: string): Promise<SSHKey | undefined> {
    if (!this.account) return

    const response = await this.sdkClient.getPosts({
      addresses: [this.account.address],
      types: this.type,
      channels: [this.channel],
      hashes: [id],
    })

    const [entity] = this.parsePosts(response.posts)
    return entity
  }

  async getByValues(values: string[]): Promise<(SSHKey | undefined)[]> {
    const all = await this.getAll()
    return values.map((value) => all.find((d) => d.key === value))
  }

  async add(
    sshKeys: AddSSHKey | AddSSHKey[],
    throwOnCollision?: boolean,
  ): Promise<SSHKey[]> {
    const steps = this.addSteps(sshKeys, throwOnCollision)

    while (true) {
      const { value, done } = await steps.next()
      if (done) return value
    }
  }

  async *addSteps(
    sshKeys: AddSSHKey | AddSSHKey[],
    throwOnCollision?: boolean,
  ): AsyncGenerator<void, SSHKey[], void> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    sshKeys = Array.isArray(sshKeys) ? sshKeys : [sshKeys]

    sshKeys = await this.parseSSHKeys(sshKeys, throwOnCollision)
    if (sshKeys.length === 0) return []

    try {
      yield
      const response = await Promise.all(
        sshKeys.map(({ key, label }) =>
          (this.sdkClient as AuthenticatedAlephHttpClient).createPost({
            postType: this.type,
            channel: this.channel,
            content: { key, label },
          }),
        ),
      )

      return this.parseNewPosts(response)
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async del(sshKeyOrId: string | SSHKey): Promise<void> {
    sshKeyOrId = typeof sshKeyOrId === 'string' ? sshKeyOrId : sshKeyOrId.id

    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    try {
      await this.sdkClient.forget({
        channel: this.channel,
        hashes: [sshKeyOrId],
      })
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async getAddSteps(
    sshKeys: AddSSHKey | AddSSHKey[],
    throwOnCollision?: boolean,
  ): Promise<CheckoutStepType[]> {
    sshKeys = Array.isArray(sshKeys) ? sshKeys : [sshKeys]
    sshKeys = await this.parseSSHKeys(sshKeys, throwOnCollision)

    return sshKeys.length ? ['ssh'] : []
  }

  async getDelSteps(
    sshKeysOrIds: string | SSHKey | (string | SSHKey)[],
  ): Promise<CheckoutStepType[]> {
    sshKeysOrIds = Array.isArray(sshKeysOrIds)
      ? sshKeysOrIds
      : [sshKeysOrIds]
    return sshKeysOrIds.length ? ['sshDel'] : []
  }

  async *delSteps(
    sshKeysOrIds: string | SSHKey | (string | SSHKey)[],
  ): AsyncGenerator<void> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    sshKeysOrIds = Array.isArray(sshKeysOrIds)
      ? sshKeysOrIds
      : [sshKeysOrIds]
    if (sshKeysOrIds.length === 0) return

    try {
      yield
      await Promise.all(
        sshKeysOrIds.map(
          async (sshKeyOrId) => await this.del(sshKeyOrId),
        ),
      )
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  protected async parseSSHKeys(
    sshKeys: AddSSHKey[],
    throwOnCollision = true,
  ): Promise<AddSSHKey[]> {
    // TODO: Validate with schema when available
    // sshKeys = await SSHKeyManager.addManySchema.parseAsync(sshKeys)

    const currentSSHKeys = await this.getAll()
    const currentSSHKeySet = new Set<string>(
      currentSSHKeys.map((d) => d.key),
    )

    if (!throwOnCollision) {
      return sshKeys.filter(
        (sshKey) => !currentSSHKeySet.has(sshKey.key),
      )
    }

    return sshKeys.map((sshKey: AddSSHKey) => {
      if (!currentSSHKeySet.has(sshKey.key)) return sshKey
      throw Err.SSHKeysUsed(sshKey.label || sshKey.key)
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected parsePosts(posts: any[]): SSHKey[] {
    return posts
      .map((post) => this.parsePost(post, post.content))
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected parseNewPosts(posts: any[]): SSHKey[] {
    return posts.map((post) => this.parsePost(post, post.content.content))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected parsePost(post: any, content: any): SSHKey {
    return {
      type: EntityType.SSHKey,
      id: post.item_hash,
      ...content,
      name: content.label || 'Unnamed SSH key',
      url: getExplorerURL(post.item_hash),
      size: convertByteUnits(
        new Blob([content.key]).size,
        'B',
        'MiB',
      ),
      date: getDate(post.time),
      confirmed: !!post.confirmed,
    }
  }
}
