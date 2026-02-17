import { z } from 'zod'
import { requiredStringSchema, optionalStringSchema } from '@/schemas/base'

export const sshKeySchema = z.object({
  key: requiredStringSchema,
  label: optionalStringSchema,
})

export const sshKeysSchema = z.array(sshKeySchema)
