import { z } from 'zod'
import { requiredStringSchema, requiredRestrictedStringSchema } from '@/schemas/base'

export const addEnvVarSchema = z.object({
  name: requiredStringSchema,
  value: requiredStringSchema,
})

export const addEnvVarsSchema = z.array(addEnvVarSchema)

export const addNameAndTagsSchema = z.object({
  name: requiredStringSchema,
  tags: z.array(z.string().trim()).optional(),
})

export const addRestrictedNameAndTagsSchema = z.object({
  name: requiredRestrictedStringSchema,
  tags: z.array(z.string().trim()).optional(),
})

export const addSpecsSchema = z.object({
  cpu: z.number().gt(0),
  ram: z.number().gt(0),
  storage: z.number().gt(0),
})
