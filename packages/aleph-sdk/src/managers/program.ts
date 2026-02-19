import type { Account } from '@aleph-sdk/account'
import {
  Encoding,
  MessageType,
  PaymentType,
} from '@aleph-sdk/message'
import type {
  MachineVolume,
  ProgramPublishConfiguration,
} from '@aleph-sdk/message'
import {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import {
  EntityType,
  PaymentMethod,
  defaultProgramChannel,
  defaultVMURL,
} from '@/constants'
import { downloadBlob, getDate, getExplorerURL } from '@/utils'
import { ExecutableManager } from '@/managers/executable'
import type { EntityManager } from '@/managers/types'
import type { VolumeManager } from '@/managers/volume'
import type { DomainManager } from '@/managers/domain'
import type { MessageManager } from '@/managers/message'
import type { FileManager } from '@/managers/file'
import type { NodeManager } from '@/managers/node'
import type {
  AddProgram,
  Program,
  ProgramCostProps,
  ProgramCost,
  ParsedCodeType,
  FunctionCodeField,
} from '@/types/program'
import type { StreamPaymentDetails } from '@/types/executable'
import type { CheckoutStepType } from '@/constants'
import { FunctionLangId, FunctionLanguage } from '@/types/lang'
import Err from '@/errors'

// Mock account for cost estimation (no real key needed)
import { ETHAccount } from '@aleph-sdk/ethereum'
const mockAccount = new ETHAccount(
  null as any,
  '0xcafecafecafecafecafecafecafecafecafecafe',
)

const mockProgramRef =
  '79f19811f8e843f37ff7535f634b89504da3d8f03e1f0af109d1791cf6add7af'
const mockEntrypoint = 'main:app'

export class ProgramManager
  extends ExecutableManager<Program>
  implements EntityManager<Program, AddProgram>
{
  // TODO: Schema validation placeholder
  static addSchema = null as any

  constructor(
    protected override account: Account | undefined,
    protected override sdkClient: AlephHttpClient | AuthenticatedAlephHttpClient,
    protected override volumeManager: VolumeManager,
    protected override domainManager: DomainManager,
    protected messageManager: MessageManager,
    protected fileManager: FileManager,
    protected override nodeManager: NodeManager,
    protected channel = defaultProgramChannel,
  ) {
    super(account, volumeManager as any, domainManager as any, nodeManager as any, sdkClient)
  }

  async getAll(): Promise<Program[]> {
    if (!this.account) return []

    try {
      const response = await this.sdkClient.getMessages({
        addresses: [this.account.address],
        messageTypes: [MessageType.program],
        channels: [this.channel],
        pagination: 200,
      })

      return await this.parseMessages(response.messages)
    } catch {
      return []
    }
  }

  async get(id: string): Promise<Program | undefined> {
    const message = await this.sdkClient.getMessage(id)
    const [entity] = await this.parseMessages([message])
    return entity
  }

  async add(newProgram: AddProgram): Promise<Program> {
    const steps = this.addSteps(newProgram)

    while (true) {
      const { value, done } = await steps.next()
      if (done) return value
    }
  }

  async *addSteps(
    newProgram: AddProgram,
  ): AsyncGenerator<void, Program, void> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    try {
      const programMessage = yield* this.parseProgramSteps(newProgram)

      yield
      const response = await this.sdkClient.createProgram({
        ...programMessage,
      })

      const [entity] = await this.parseMessages([response])
      if (!entity) throw Err.RequestFailed('Failed to parse program message')

      yield* this.parseDomainsSteps(entity.id, newProgram.domains)

      return entity
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async del(programOrId: string | Program): Promise<void> {
    const id =
      typeof programOrId === 'string' ? programOrId : programOrId.id

    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    try {
      await this.sdkClient.forget({
        channel: this.channel,
        hashes: [id],
      })
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  async download(program: Program): Promise<void> {
    const ref = program.code.ref
    const storeMessage = await this.messageManager.get(ref) as any
    const volumeRef = storeMessage.content.item_hash

    const programStorageURL =
      `${(this.sdkClient as any).apiServer || 'https://api.aleph.im'}/api/v0/storage/raw/`

    const req = await fetch(`${programStorageURL}${volumeRef}`)
    const blob = await req.blob()

    return downloadBlob(blob, `VM_${program.id.slice(-12)}.zip`)
  }

  async getStreamPaymentDetails(): Promise<StreamPaymentDetails | undefined> {
    return undefined
  }

  async getAddSteps(newProgram: AddProgram): Promise<CheckoutStepType[]> {
    const steps: CheckoutStepType[] = []
    const { domains = [] } = newProgram

    steps.push('program')

    if (domains.length > 0) steps.push('domain')

    return steps
  }

  async getDelSteps(
    programsOrIds: string | Program | (string | Program)[],
  ): Promise<CheckoutStepType[]> {
    const steps: CheckoutStepType[] = []
    const items = Array.isArray(programsOrIds)
      ? programsOrIds
      : [programsOrIds]
    for (const _item of items) {
      steps.push('volumeDel')
      steps.push('programDel')
    }
    return steps
  }

  async *delSteps(
    programsOrIds: string | Program | (string | Program)[],
  ): AsyncGenerator<void> {
    if (!(this.sdkClient instanceof AuthenticatedAlephHttpClient))
      throw Err.InvalidAccount

    const items = Array.isArray(programsOrIds)
      ? programsOrIds
      : [programsOrIds]
    if (items.length === 0) return

    try {
      for (const programOrId of items) {
        if (typeof programOrId !== 'string') {
          yield
          await this.volumeManager.del(programOrId.code.ref)
        }
        yield
        await this.del(programOrId)
      }
    } catch (err) {
      throw Err.RequestFailed(err)
    }
  }

  override async getTotalCostByHash(
    paymentMethod: PaymentMethod | PaymentType,
    hash: string,
  ): Promise<number> {
    const costs = await (this.sdkClient as any).programClient.getCost(hash)
    return this.parseCost(paymentMethod, Number(costs.cost))
  }

  async getCost(newProgram: ProgramCostProps): Promise<ProgramCost> {
    let totalCost = Number.POSITIVE_INFINITY
    const paymentMethod = newProgram.payment?.type || PaymentMethod.Hold

    const parsedProgram: ProgramPublishConfiguration =
      await this.parseProgramForCostEstimation(newProgram)

    const costs =
      await (this.sdkClient as any).programClient.getEstimatedCost(parsedProgram)

    totalCost = Number(costs.cost)

    const lines = this.getExecutableCostLines(
      {
        type: EntityType.Program,
        isPersistent: newProgram.isPersistent,
        ...parsedProgram,
      },
      costs,
    )

    return {
      cost: this.parseCost(paymentMethod, totalCost),
      paymentMethod,
      lines: [...lines],
    }
  }

  protected async parseCodeForCostEstimation(
    code: FunctionCodeField,
  ): Promise<ParsedCodeType> {
    return {
      encoding: Encoding.zip,
      entrypoint: ('entrypoint' in code ? code.entrypoint : undefined) || mockEntrypoint,
      programRef: mockProgramRef,
    }
  }

  protected async parseCode(code: FunctionCodeField): Promise<ParsedCodeType> {
    if (code.type === 'text') {
      // Dynamic import JSZip - it's a peer dependency
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const JSZip = (await import(/* webpackIgnore: true */ 'jszip' as string)).default as any
      const jsZip = new JSZip()
      const fileExt = code.lang === FunctionLangId.Python ? 'py' : 'js'
      jsZip.file('main.' + fileExt, code.text)
      const zip = await jsZip.generateAsync({ type: 'blob' })

      return {
        entrypoint: 'main:app',
        file: zip as unknown as Blob,
        encoding: Encoding.zip,
      }
    } else if (code.type === 'file') {
      if (!code.file) throw Err.InvalidCodeFile
      const fileName = code.file.name

      let encoding: Encoding

      if (fileName.endsWith('.zip')) {
        encoding = Encoding.zip
      } else if (fileName.endsWith('.sqsh')) {
        encoding = Encoding.squashfs
      } else {
        throw Err.InvalidCodeFile
      }

      return {
        entrypoint: code.entrypoint,
        file: code.file,
        encoding,
      }
    } else if (code.type === 'ref') {
      return {
        entrypoint: code.entrypoint,
        encoding: code.encoding,
        programRef: code.programRef,
      }
    }
    throw Err.InvalidCodeType
  }

  protected async parseProgramForCostEstimation(
    newProgram: AddProgram,
  ): Promise<ProgramPublishConfiguration> {
    const account = this.account || mockAccount
    const { channel } = this
    const { isPersistent, specs } = newProgram

    const parsedSpecs = this.parseSpecs(specs)
    const memory = parsedSpecs?.memory
    const vcpus = parsedSpecs?.vcpus

    const runtime = this.parseRuntime(newProgram)
    const payment = this.parsePaymentForCostEstimation(newProgram.payment)
    const volumes = await this.parseVolumesForCostEstimation(
      newProgram.volumes,
    )
    const code = await this.parseCodeForCostEstimation(newProgram.code)

    return {
      account,
      channel,
      runtime,
      isPersistent,
      ...(memory !== undefined ? { memory } : {}),
      ...(vcpus !== undefined ? { vcpus } : {}),
      ...(volumes ? { volumes } : {}),
      ...code,
      payment,
    } as ProgramPublishConfiguration
  }

  protected async *parseProgramSteps(
    newProgram: AddProgram,
  ): AsyncGenerator<void, ProgramPublishConfiguration, void> {
    if (!this.account) throw Err.InvalidAccount

    // TODO: Schema validation
    // newProgram = await ProgramManager.addSchema.parseAsync(newProgram)

    const { account, channel } = this

    const { name, tags, isPersistent, envVars, specs } = newProgram

    const variables = this.parseEnvVars(envVars)

    const parsedSpecs = this.parseSpecs(specs)
    const memory = parsedSpecs?.memory
    const vcpus = parsedSpecs?.vcpus

    const metadata = this.parseMetadata(name, tags)
    const runtime = this.parseRuntime(newProgram)
    const payment = this.parsePayment(newProgram.payment)
    const volumes = yield* this.parseVolumesSteps(newProgram.volumes)
    const code = await this.parseCode(newProgram.code)

    return {
      account,
      channel,
      runtime,
      isPersistent,
      ...(variables ? { variables } : {}),
      ...(memory !== undefined ? { memory } : {}),
      ...(vcpus !== undefined ? { vcpus } : {}),
      ...(volumes ? { volumes } : {}),
      ...code,
      metadata,
      payment,
    } as ProgramPublishConfiguration
  }

  protected parseRuntime({ code, runtime }: AddProgram): string {
    if (runtime) return runtime
    const langId = code.lang as FunctionLangId
    if (langId === FunctionLangId.Other) throw Err.CustomRuntimeNeeded
    return FunctionLanguage[langId]!.runtime
  }

  protected async parseMessages(messages: any[]): Promise<Program[]> {
    const sizesMap = await this.fileManager.getSizesMap()

    return messages
      .filter(({ content }: any) => content !== undefined)
      .map((message: any) => {
        const size =
          (sizesMap[message.content.code.ref] || 0) +
          (message.content.volumes || []).reduce(
            (ac: number, cv: MachineVolume) =>
              ac +
              ('size_mib' in cv
                ? cv.size_mib
                : sizesMap[cv.ref] || 0),
            0,
          )

        return {
          id: message.item_hash,
          chain: message.chain,
          ...message.content,
          name: message.content.metadata?.name || 'Unnamed program',
          type: EntityType.Program,
          url: getExplorerURL(message.item_hash),
          urlVM: `${defaultVMURL}${message.item_hash}`,
          date: getDate(message.time),
          size,
          refUrl: `/storage/volume/${message.content.code.ref}`,
          confirmed: !!message.confirmed,
        }
      })
  }
}
