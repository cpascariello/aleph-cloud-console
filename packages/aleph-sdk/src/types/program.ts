import type { Encoding, ProgramContent } from '@aleph-sdk/message'
import type { EntityType } from '@/constants'
import type { CostSummary } from '@/types/cost'
import type { PaymentConfiguration } from '@/types/executable'
import type {
  DomainField,
  EnvVarField,
  InstanceSpecsField,
  NameAndTagsField,
  VolumeField,
} from '@/types/fields'

export type FunctionCodeField =
  | { type: 'file'; file: File; entrypoint: string; lang: string }
  | { type: 'text'; text: string; lang: string }
  | {
      type: 'ref'
      encoding: Encoding
      programRef: string
      entrypoint: string
      lang: string
    }

export type CustomFunctionRuntimeField = string

export type AddProgram = NameAndTagsField & {
  isPersistent: boolean
  code: FunctionCodeField
  specs: InstanceSpecsField
  runtime?: CustomFunctionRuntimeField
  envVars?: EnvVarField[]
  volumes?: VolumeField[]
  domains?: Omit<DomainField, 'ref'>[]
  payment?: PaymentConfiguration
}

export type Program = Omit<ProgramContent, 'type'> & {
  type: EntityType.Program
  id: string
  name: string
  url: string
  urlVM: string
  date: string
  size: number
  refUrl: string
  confirmed?: boolean
}

export type ProgramCostProps = AddProgram

export type ProgramCost = CostSummary

export type ParsedCodeType = {
  encoding: Encoding
  entrypoint: string
} & (
  | {
      file?: undefined
      programRef: string
    }
  | {
      file: Blob | Buffer
      programRef?: undefined
    }
)
