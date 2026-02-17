import { z } from 'zod'
import { Encoding } from '@aleph-sdk/message'
import {
  addNameAndTagsSchema,
  addSpecsSchema,
  addEnvVarsSchema,
} from '@/schemas/execution'
import { addDomainsSchema } from '@/schemas/domain'
import { addVolumesSchema } from '@/schemas/volume'
import {
  codeFileSchema,
  messageHashSchema,
  paymentMethodSchema,
  requiredStringSchema,
} from '@/schemas/base'
import { FunctionLangId } from '@/types/lang'

const defaultCode = z.object({
  lang: z.string(),
})

export const addCodeSchema = z.discriminatedUnion('type', [
  defaultCode.extend({
    type: z.literal('file'),
    file: codeFileSchema,
    entrypoint: requiredStringSchema,
  }),
  defaultCode.extend({
    type: z.literal('text'),
    text: requiredStringSchema,
  }),
  defaultCode.extend({
    type: z.literal('ref'),
    encoding: z.enum([Encoding.squashfs, Encoding.zip, Encoding.plain]),
    programRef: messageHashSchema,
    entrypoint: requiredStringSchema,
  }),
])

export const functionSchema = z
  .object({
    paymentMethod: paymentMethodSchema,
    code: addCodeSchema,
    isPersistent: z.boolean(),
    specs: addSpecsSchema,
    runtime: z.string().optional(),
    volumes: addVolumesSchema,
    envVars: addEnvVarsSchema.optional(),
    domains: addDomainsSchema,
    payment: z.any().optional(),
  })
  .merge(addNameAndTagsSchema)
  .refine(
    ({ code, runtime }) =>
      Boolean(runtime) || code.lang !== FunctionLangId.Other,
    { message: 'Invalid function runtime', path: ['runtime'] },
  )
