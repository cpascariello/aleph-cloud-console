import { z } from 'zod'
import { domainNameSchema, targetSchema } from '@/schemas/base'

export const domainSchema = z.object({
  name: domainNameSchema,
  target: targetSchema,
  ref: z.string().min(1),
})

export const domainsSchema = z.array(domainSchema)

export const addDomainsSchema = z
  .array(
    z.object({
      name: domainNameSchema,
      target: targetSchema,
    }),
  )
  .optional()
