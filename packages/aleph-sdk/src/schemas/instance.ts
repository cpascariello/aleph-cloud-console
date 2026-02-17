import { z } from 'zod'
import {
  addNameAndTagsSchema,
  addSpecsSchema,
  addEnvVarsSchema,
} from '@/schemas/execution'
import { addDomainsSchema } from '@/schemas/domain'
import { addVolumesSchema } from '@/schemas/volume'
import { sshKeysSchema } from '@/schemas/ssh'

export const instanceSchema = z
  .object({
    image: z.string().min(1),
    specs: addSpecsSchema,
    sshKeys: sshKeysSchema,
    volumes: addVolumesSchema,
    systemVolume: z.object({
      size: z.number().gt(0),
    }),
    envVars: addEnvVarsSchema.optional(),
    domains: addDomainsSchema,
    payment: z.any().optional(),
    requirements: z.any().optional(),
    node: z.any().optional(),
  })
  .merge(addNameAndTagsSchema)

export const instanceStreamSchema = instanceSchema.extend({
  payment: z.object({
    type: z.literal('stream'),
    chain: z.string(),
    sender: z.string(),
    receiver: z.string(),
    streamCost: z.number(),
    streamDuration: z.object({
      duration: z.number(),
      unit: z.string(),
    }),
  }),
})
