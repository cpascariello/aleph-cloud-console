import { Account } from '@aleph-sdk/account'
import {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import { ItemType } from '@aleph-sdk/message'
import {
  crnListProgramUrl,
  defaultAccountChannel,
  monitorAddress,
  postType,
  scoringAddress,
  tags,
  channel,
  DEFAULT_API_SERVER,
} from '@/constants'
import {
  extractValidEthAddress,
  fetchAndCache,
  getLatestReleases,
  getVersionNumber,
  sleep,
} from '@/utils'
import Err from '@/errors'
import type { FileManager } from '@/managers/file'
import type {
  CCN,
  CRN,
  AlephNode,
  CCNScore,
  CRNScore,
  CCNMetrics,
  CRNMetrics,
  CRNSpecs,
  CRNBenchmark,
  CRNConfig,
  NodeLastVersions,
} from '@/types/node'

export type NodesResponse = {
  ccns: CCN[]
  crns: CRN[]
  timestamp: number
}

export type NewCCN = {
  name: string
  multiaddress?: string
}

export type NewCRN = {
  name: string
  address: string
}

export type BaseUpdateNode = {
  hash?: string
  picture?: string | File
  banner?: string | File
  name?: string
  description?: string
  reward?: string
  authorized?: string | string[]
  locked?: boolean
  registration_url?: string
  manager?: string
}

export type UpdateCCN = BaseUpdateNode & {
  multiaddress?: string
}

export type UpdateCRN = BaseUpdateNode & {
  address?: string
  stream_reward?: string
  terms_and_conditions?: string | File
}

export type UpdateAlephNode = UpdateCCN | UpdateCRN

export type ReducedCRNSpecs = {
  cpu: number
  ram: number
  storage: number
}

export type CRNIps = {
  hash: string
  name?: string
  host: boolean
  vm: boolean
}

export enum StreamNotSupportedIssue {
  Valid = 0,
  IPV6 = 1,
  MinSpecs = 2,
  Version = 3,
  RewardAddress = 4,
  MismatchRewardAddress = 5,
}

export class NodeManager {
  // TODO: Schema validation placeholders
  static newCCNSchema = null as any
  static newCRNSchema = null as any
  static updateCCNSchema = null as any
  static updateCRNSchema = null as any

  static maxStakedPerNode = 1_000_000
  static maxLinkedPerNode = 5

  static validateMinNodeSpecs(
    minSpecs: ReducedCRNSpecs,
    nodeSpecs: CRNSpecs,
  ): boolean {
    return (
      minSpecs.cpu <= ((nodeSpecs as any).cpu?.count || 0) &&
      minSpecs.ram <=
        ((nodeSpecs as any).mem?.available_kB || 0) / 1024 &&
      minSpecs.storage <=
        ((nodeSpecs as any).disk?.available_kB || 0) / 1024
    )
  }

  static normalizeUrl(url: string): string {
    return url?.toLowerCase().replace(/\/$/, '')
  }

  constructor(
    protected fileManager: FileManager,
    protected sdkClient: AlephHttpClient | AuthenticatedAlephHttpClient,
    protected account?: Account,
    protected channelId = defaultAccountChannel,
    protected apiServer = DEFAULT_API_SERVER,
  ) {}

  async getCCNNodes(): Promise<CCN[]> {
    const { ccns } = await this.getAllNodes()
    return ccns
  }

  async getCRNNodes(): Promise<CRN[]> {
    const { crns } = await this.getAllNodes()
    return crns
  }

  async getAllNodes(): Promise<NodesResponse> {
    const response = await this.fetchAllNodes()

    const { timestamp } = response
    let { ccns, crns } = response

    crns = this.parseResourceNodes(crns)

    crns = await this.parseScores(crns, true)
    crns = await this.parseMetrics(crns, true)

    ccns = await this.parseScores(ccns, false)
    ccns = await this.parseMetrics(ccns, false)

    this.linkChildrenNodes(ccns, crns)
    this.linkParentNodes(crns, ccns)

    return { ccns, crns, timestamp }
  }

  // TODO: subscribeNodesFeed removed - requires WebSocket subscription
  // Placeholder: returns empty async generator
  async *subscribeNodesFeed(
    _abort: Promise<void>,
  ): AsyncGenerator<NodesResponse> {
    // WebSocket subscription not yet implemented in SDK
  }

  async getAllCRNsSpecs(): Promise<CRNSpecs[]> {
    try {
      const response = await fetchAndCache(
        crnListProgramUrl,
        'all_crn_specs',
        300_000,
        (res: { crns: any[]; last_refresh: string }) => {
          if (res.crns === undefined) throw Err.InvalidResponse

          const formattedCrns: CRNSpecs[] = res.crns.map(
            (crn: any) => {
              const { system_usage, ...rest } = crn
              return {
                ...system_usage,
                ...rest,
              }
            },
          )

          return {
            ...res,
            crns: formattedCrns,
          }
        },
      )

      return (response as any).crns
    } catch (e) {
      console.error(e)
      return []
    }
  }

  async getCRNsSpecs(nodes: CRN[]): Promise<CRNSpecs[]> {
    const specs = await Promise.all(
      nodes.map((node) => this.getCRNspecs(node)),
    )
    return specs.filter(
      (spec): spec is CRNSpecs => spec !== undefined,
    )
  }

  async getCRNspecs(
    node: CRN,
    retries = 2,
  ): Promise<CRNSpecs | undefined> {
    if (!node.address) return

    const nodeUrl = NodeManager.normalizeUrl(node.address)
    const url = `${nodeUrl}/about/usage/system`

    try {
      new URL(url)
    } catch {
      return
    }

    try {
      return await fetchAndCache(
        url,
        `crn_specs_${node.hash}_1`,
        3_600,
        (res: any) => {
          if (res.cpu === undefined) throw Err.InvalidResponse

          return {
            ...res,
            hash: node.hash,
            name: node.name,
          }
        },
      )
    } catch {
      if (!retries) return
      await sleep(200)
      return this.getCRNspecs(node, retries - 1)
    }
  }

  async getCRNConfig(
    node: CRN,
    retries = 2,
  ): Promise<CRNConfig | undefined> {
    if (!node.address) return

    const address = node.address.toLowerCase().replace(/\/$/, '')
    const url = `${address}/status/config`

    try {
      new URL(url)
    } catch {
      return
    }

    try {
      return await fetchAndCache(
        url,
        `crn_specs_${node.hash}_2`,
        3_600,
        (res: any) => {
          const config = {
            ...res,
            hash: node.hash,
            name: node.name,
          }
          // Inject matched_reward_addresses comparison
          if (config.payment) {
            config.payment = {
              ...config.payment,
              matched_reward_addresses:
                config.payment.PAYMENT_RECEIVER_ADDRESS ===
                node.stream_reward,
            }
          }
          return config
        },
      )
    } catch {
      if (!retries) return
      await sleep(200)
      return this.getCRNConfig(node, retries - 1)
    }
  }

  async getCRNips(
    node: CRN,
    retries = 2,
  ): Promise<CRNIps | undefined> {
    if (!node.address) return

    const address = node.address.toLowerCase().replace(/\/$/, '')
    const url = `${address}/status/check/ipv6`

    try {
      new URL(url)
    } catch {
      return
    }

    try {
      return await fetchAndCache(
        url,
        `crn_ips_${node.hash}_1`,
        3_600,
        (res: any) => {
          if (res.vm === undefined) throw Err.InvalidResponse

          return {
            ...res,
            hash: node.hash,
            name: node.name,
          }
        },
      )
    } catch {
      if (!retries) return
      await sleep(200)
      return this.getCRNips(node, retries - 1)
    }
  }

  async getCRNBenchmark(
    node: CRN,
    retries = 4,
  ): Promise<CRNBenchmark | undefined> {
    if (!node.address) return
    const { hash, name } = node

    const address = node.address.toLowerCase().replace(/\/$/, '')
    const benchmarkVmId =
      '873889eb4ce554385e7263724bd0745130099c24fd9c535f0a648100138a2514'
    const url1 = `${address}/vm/${benchmarkVmId}/benchmark`
    const url2 = `${address}/vm/${benchmarkVmId}/memory_speed`

    try {
      new URL(url1)
      new URL(url2)
    } catch {
      return
    }

    try {
      const [cpu, _ram] = await Promise.all([
        fetchAndCache(
          url1,
          `4crn_benchmark_cpu_${node.hash}`,
          3_600,
          (res: any) => {
            if (res.benchmark === undefined)
              throw Err.InvalidResponse
            return res
          },
        ),
        fetchAndCache(
          url2,
          `4crn_benchmark_ram_${node.hash}`,
          3_600,
          (res: any) => {
            if (res.speed_str === undefined)
              throw Err.InvalidResponse
            return res
          },
        ),
      ])

      return {
        hash,
        name: name || '',
        benchmark: (cpu as any).benchmark?.average || 0,
      }
    } catch {
      if (!retries) return
      await sleep(200)
      return this.getCRNBenchmark(node, retries - 1)
    }
  }

  async getLatestVersion(
    node: AlephNode,
  ): Promise<NodeLastVersions> {
    return this.isCRN(node)
      ? this.getLatestCRNVersion()
      : this.getLatestCCNVersion()
  }

  async getLatestCCNVersion(): Promise<NodeLastVersions> {
    return fetchAndCache(
      'https://api.github.com/repos/aleph-im/pyaleph/releases',
      'ccn_versions',
      300_000,
      getLatestReleases,
    )
  }

  async getLatestCRNVersion(): Promise<NodeLastVersions> {
    return fetchAndCache(
      'https://api.github.com/repos/aleph-im/aleph-vm/releases',
      'crn_versions',
      300_000,
      getLatestReleases,
    )
  }

  async newCoreChannelNode(newCCN: NewCCN): Promise<string> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    // TODO: Schema validation
    // newCCN = await NodeManager.newCCNSchema.parseAsync(newCCN)

    const res = await this.sdkClient.createPost({
      postType,
      channel,
      content: {
        tags: ['create-node', ...tags],
        action: 'create-node',
        details: newCCN,
      },
      storageEngine: ItemType.inline,
    })

    return res.item_hash
  }

  async newComputeResourceNode(newCRN: NewCRN): Promise<string> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    // TODO: Schema validation
    // newCRN = await NodeManager.newCRNSchema.parseAsync(newCRN)

    const res = await this.sdkClient.createPost({
      postType,
      channel,
      content: {
        tags: ['create-resource-node', ...tags],
        action: 'create-resource-node',
        details: { ...newCRN, type: 'compute' },
      },
      storageEngine: ItemType.inline,
    })

    return res.item_hash
  }

  async updateCoreChannelNode(
    updateCCN: UpdateCCN,
  ): Promise<[string, Partial<CCN>]> {
    // TODO: Schema validation
    // updateCCN = await NodeManager.updateCCNSchema.parseAsync(updateCCN)

    return this.updateNode(updateCCN, 'create-node')
  }

  async updateComputeResourceNode(
    updateCRN: UpdateCRN,
  ): Promise<[string, Partial<CRN>]> {
    // TODO: Schema validation
    // updateCRN = await NodeManager.updateCRNSchema.parseAsync(updateCRN)

    return this.updateNode(updateCRN, 'create-resource-node')
  }

  async removeNode(hash: string): Promise<string> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    const res = await this.sdkClient.createPost({
      postType,
      channel,
      ref: hash,
      content: {
        tags: ['drop-node', ...tags],
        action: 'drop-node',
      },
      storageEngine: ItemType.inline,
    })

    return res.item_hash
  }

  async linkComputeResourceNode(
    crnHash: string,
  ): Promise<void> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    await this.sdkClient.createPost({
      postType,
      channel,
      ref: crnHash,
      content: {
        tags: ['link', ...tags],
        action: 'link',
      },
      storageEngine: ItemType.inline,
    })
  }

  async unlinkComputeResourceNode(
    crnHash: string,
  ): Promise<void> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    await this.sdkClient.createPost({
      postType,
      channel,
      ref: crnHash,
      content: {
        tags: ['unlink', ...tags],
        action: 'unlink',
      },
      storageEngine: ItemType.inline,
    })
  }

  isCRN(node: AlephNode): node is CRN {
    return Object.hasOwn(node, 'parent')
  }

  isKYCRequired(node: CCN): boolean {
    return (
      node.registration_url !== undefined &&
      node.registration_url !== ''
    )
  }

  isKYCCleared(node: CCN): boolean {
    if (!this.account) return false
    return node.authorized?.includes(this.account.address) || false
  }

  isLocked(node: CCN): boolean {
    if (!node.locked) return false
    return !(this.isKYCRequired(node) && this.isKYCCleared(node))
  }

  isUserNode(node: AlephNode): boolean {
    if (!this.account) return false
    return this.account.address === node.owner
  }

  isUserStake(node: CCN): boolean {
    if (!this.account) return false
    return !!node.stakers[this.account.address]
  }

  isLinked(node: CRN): boolean {
    return !!node.parentData
  }

  isUserLinked(node: CRN, userNode?: CCN): boolean {
    if (!userNode) return false

    return (
      (this.isUserNode(userNode) &&
        userNode.hash === node.parent) ||
      (this.isUserNode(node) && !!node.parent)
    )
  }

  isUnlinkableBy(node: CRN, userNode?: CCN): boolean {
    if (!userNode) return false

    return (
      (this.isUserNode(userNode) &&
        userNode.hash === node.parent) ||
      (this.isUserNode(node) && !!node.parent)
    )
  }

  isStakeable(node: CCN): [boolean, string] {
    if (node.total_staked >= NodeManager.maxStakedPerNode)
      return [false, 'Too many ALEPH staked on that node']

    if (this.isLocked(node))
      return [false, 'This node is locked']

    return [true, `${node.hash} is stakeable`]
  }

  isStakeableBy(
    node: CCN,
    balance: number | undefined,
  ): [boolean, string] {
    const isStakeable = this.isStakeable(node)
    if (!isStakeable[0]) return isStakeable

    if (!balance || balance < 10_000)
      return [
        false,
        'You need at least 10000 ALEPH to stake',
      ]

    if (this.isUserNode(node))
      return [
        false,
        "You can't stake while you operate a node",
      ]

    if (this.isUserStake(node))
      return [false, 'Already staking in this node']

    return [
      true,
      `Stake ${balance.toFixed(2)} ALEPH in this node`,
    ]
  }

  isLinkable(node: CRN): [boolean, string] {
    if (node.locked)
      return [false, 'This node is locked']

    if (node.parent)
      return [
        false,
        `The node is already linked to ${node.parent} ccn`,
      ]

    return [true, `${node.hash} is linkable`]
  }

  isLinkableBy(
    node: CRN,
    userNode: CCN | undefined,
  ): [boolean, string] {
    const isLinkable = this.isLinkable(node)
    if (!isLinkable[0]) return isLinkable

    if (!userNode || !this.isUserNode(userNode))
      return [
        false,
        "The user doesn't own a core channel node",
      ]

    if (node.locked)
      return [false, 'This node is locked']

    if (node.parent)
      return [
        false,
        `The node is already linked to ${node.parent} ccn`,
      ]

    if (
      userNode.resource_nodes.length >=
      NodeManager.maxLinkedPerNode
    )
      return [
        false,
        `The user node is already linked to ${userNode.resource_nodes.length} nodes`,
      ]

    return [true, `Link ${node.hash} to ${userNode.hash}`]
  }

  hasIssues(
    node: AlephNode,
    staking = false,
  ): string | undefined {
    if (this.isCRN(node)) {
      if (node.score < 0.8)
        return 'The CRN is underperforming'
      if (!node.parentData)
        return 'The CRN is not being linked to a CCN'
      if ((node?.parentData?.score || 0) <= 0)
        return 'The linked CCN is underperforming'
    } else {
      if (node.score < 0.8)
        return 'The CCN is underperforming'
      if ((node?.crnsData.length || 0) < 2)
        return 'The CCN has free slots to link more CRNs'
      if (
        !staking &&
        node?.crnsData.some((crn) => crn.score < 0.8)
      )
        return 'One of the linked CRN is underperforming'
    }
  }

  getNodeVersionNumber(node: CRN | CRNSpecs): number {
    if ('cpu' in node && (node as any).version) {
      return getVersionNumber((node as any).version)
    }

    if (
      'metricsData' in node &&
      (node as any).metricsData?.version
    ) {
      return getVersionNumber(
        (node as any).metricsData.version,
      )
    }

    return 0
  }

  isStreamPaymentNotSupported(
    node: CRN | CRNSpecs,
  ): StreamNotSupportedIssue {
    if (!extractValidEthAddress(node.stream_reward))
      return StreamNotSupportedIssue.RewardAddress

    if (
      this.getNodeVersionNumber(node) <
      getVersionNumber('1.1.0')
    )
      return StreamNotSupportedIssue.Version

    return StreamNotSupportedIssue.Valid
  }

  async isStreamPaymentFullySupported(
    node: CRN | CRNSpecs,
  ): Promise<boolean> {
    const basicCheck = this.isStreamPaymentNotSupported(node)
    if (basicCheck !== StreamNotSupportedIssue.Valid) {
      return false
    }

    if ('cpu' in node) {
      const config = await this.getCRNConfig(node as unknown as CRN)
      if (!(config?.payment as any)?.matched_reward_addresses) {
        return false
      }
    }

    return true
  }

  validateMinNodeSpecs(
    minSpecs: ReducedCRNSpecs,
    nodeSpecs: CRNSpecs,
  ): boolean {
    return NodeManager.validateMinNodeSpecs(minSpecs, nodeSpecs)
  }

  protected async fetchAllNodes(): Promise<NodesResponse> {
    return fetchAndCache(
      `${this.apiServer}/api/v0/aggregates/${monitorAddress}.json?keys=corechannel&limit=100`,
      'nodes',
      1000 * 5,
      async (content: any) => {
        const crns: CRN[] =
          content?.data?.corechannel?.resource_nodes
        const ccns: CCN[] =
          content?.data?.corechannel?.nodes

        const timestamp = 0

        return { ccns, crns, timestamp }
      },
    )
  }

  protected async updateNode<
    U extends UpdateAlephNode,
    N extends AlephNode,
  >(
    { hash, ...details }: U,
    action: 'create-node' | 'create-resource-node',
  ): Promise<[string, Partial<N>]> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    if (!hash) throw Err.InvalidParameter('hash')

    if (!details.locked) {
      details.registration_url = ''
    }

    if (details.picture instanceof File) {
      const { contentItemHash } =
        await this.fileManager.uploadFile(details.picture)
      details.picture = contentItemHash
    }

    if (details.banner instanceof File) {
      const { contentItemHash } =
        await this.fileManager.uploadFile(details.banner)
      details.banner = contentItemHash
    }

    if (
      'terms_and_conditions' in details &&
      details.terms_and_conditions instanceof File
    ) {
      const { messageItemHash } =
        await this.fileManager.uploadFile(
          details.terms_and_conditions,
        )
      details.terms_and_conditions = messageItemHash
    }

    const res = await this.sdkClient.createPost({
      postType: 'amend',
      ref: hash,
      content: {
        tags: [action, ...tags],
        action,
        details,
      },
      channel,
      storageEngine: ItemType.inline,
    })

    return [
      res.item_hash,
      {
        hash,
        ...details,
        picture: details.picture as string,
        banner: details.banner as string,
      } as unknown as Partial<N>,
    ]
  }

  protected parseResourceNodes(crns: CRN[]): CRN[] {
    return crns.map((crn) => {
      crn.locked = !!crn.locked
      return crn
    })
  }

  protected linkChildrenNodes(
    ccns: CCN[],
    crns: CRN[],
  ): void {
    const crnsMap = crns.reduce(
      (ac, cu) => {
        if (!cu.parent) return ac

        const list = (ac[cu.parent] = ac[cu.parent] || [])
        list.push(cu)

        return ac
      },
      {} as Record<string, CRN[]>,
    )

    for (const ccn of ccns) {
      ccn.crnsData = crnsMap[ccn.hash] || []
    }
  }

  protected linkParentNodes(
    crns: CRN[],
    ccns: CCN[],
  ): void {
    const ccnsMap = ccns.reduce(
      (ac, cu) => {
        ac[cu.hash] = cu
        return ac
      },
      {} as Record<string, CCN>,
    )

    for (const crn of crns) {
      if (!crn.parent) continue

      const parentData = ccnsMap[crn.parent]
      if (!parentData) continue

      crn.parentData = parentData
    }
  }

  protected async parseScores<T extends AlephNode>(
    nodes: T[],
    isCRN: boolean,
  ): Promise<T[]> {
    const scores = isCRN
      ? await this.getCRNScores()
      : await this.getCCNScores()
    const scoresMap = new Map(
      scores.map((score) => [score.node_id, score]),
    )

    return nodes.map((node) => {
      const scoreData = scoresMap.get(node.hash)
      if (!scoreData) return node

      return {
        ...node,
        score: scoreData.total_score,
        decentralization: scoreData.decentralization,
        performance: scoreData.performance,
        version: scoreData.version,
        scoreData,
      }
    })
  }

  protected async parseMetrics<T extends AlephNode>(
    nodes: T[],
    isCRN: boolean,
  ): Promise<T[]> {
    const metrics = isCRN
      ? await this.getCRNMetrics()
      : await this.getCCNMetrics()

    const metricsMap = new Map(
      metrics.map((m: any) => [m.node_id, m]),
    )

    return nodes.map((node) => {
      const metricsData = metricsMap.get(node.hash)
      if (!metricsData) return node

      return {
        ...node,
        metricsData,
      }
    })
  }

  protected async getScores(): Promise<{
    ccn: CCNScore[]
    crn: CRNScore[]
  }> {
    const res = await this.sdkClient.getPosts({
      types: 'aleph-scoring-scores',
      addresses: [scoringAddress],
      pagination: 1,
      page: 1,
    })

    return (res.posts[0]?.content as any)?.scores
  }

  protected async getMetrics(): Promise<{
    ccn: CCNMetrics[]
    crn: CRNMetrics[]
  }> {
    const res = await this.sdkClient.getPosts({
      types: 'aleph-network-metrics',
      addresses: [scoringAddress],
      pagination: 1,
      page: 1,
    })

    return (res.posts[0]?.content as any)?.metrics
  }

  protected async getCCNScores(): Promise<CCNScore[]> {
    const res = await this.getScores()
    return res.ccn
  }

  protected async getCCNMetrics(): Promise<CCNMetrics[]> {
    const res = await this.getMetrics()
    return res.ccn
  }

  protected async getCRNScores(): Promise<CRNScore[]> {
    const res = await this.getScores()
    return res.crn
  }

  protected async getCRNMetrics(): Promise<CRNMetrics[]> {
    const res = await this.getMetrics()
    return res.crn
  }
}
