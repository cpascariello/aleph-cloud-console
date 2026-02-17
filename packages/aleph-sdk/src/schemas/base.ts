import { z } from 'zod'
import { EntityDomainType, PaymentMethod } from '@/constants'
import { Blockchain as BlockchainId } from '@aleph-sdk/core'

export const requiredStringSchema = z
  .string()
  .trim()
  .min(1, { message: 'Required field' })

export const requiredRestrictedStringSchema = requiredStringSchema.regex(
  /^[a-zA-Z0-9_-]+$/,
  { message: 'Invalid name format (only a-zA-Z0-9_- are allowed)' },
)

export const requiredVolumeNameSchema = requiredStringSchema.regex(
  /^[a-zA-Z0-9_-]+$/,
  {
    message:
      'Volume name can only contain letters, numbers, underscores, and dashes',
  },
)

export function optionalString(
  schema: z.ZodString,
): z.ZodOptional<z.ZodString> | z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<''>]> {
  return schema.optional().or(z.literal(''))
}

export const optionalStringSchema = z.string().trim().optional()

export const urlSchema = requiredStringSchema.regex(
  /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/,
  { message: 'Invalid url format' },
)

export const multiaddressSchema = requiredStringSchema.regex(
  /^\/ip4\/(?:\d{1,3}\.){3}\d{1,3}\/tcp\/\d{1,4}\/p2p\/Qm[1-9A-HJ-NP-Za-km-z]{44}$/,
  { message: 'Invalid multiaddress format' },
)

export const ethereumAddressSchema = requiredStringSchema.regex(
  /^0x[a-fA-F0-9]{40}$/,
  { message: 'Invalid address format' },
)

export const messageHashSchema = requiredStringSchema.regex(/^[0-9a-f]{64}$/, {
  message: 'Invalid hash format',
})

export const fileSchema = z.custom<File>()

export const domainNameSchema = requiredStringSchema.regex(
  /^((?!-))(xn--)?([a-z0-9][a-z0-9-_]{0,61}[a-z0-9]{0,1}\.)+((xn--)?([a-z0-9-]{1,61}|[a-z0-9-]{1,30}\.[a-z]{2,}))$/,
  { message: 'Invalid domain format' },
)

export const linuxPathSchema = requiredStringSchema
  .regex(/^(\/[^/ ]*)+\/?$/, { message: 'Invalid path format' })
  .regex(/^(\/[a-zA-Z0-9_-]*)+\/?$/, {
    message:
      'Mount path can only contain alphanumeric characters, underscores, and dashes',
  })

export const volumeFileSchema = z
  .custom<File>((val) => val instanceof File, 'Required file')
  .refine(
    (file) =>
      file.name.endsWith('.zip') ||
      file.name.endsWith('.sqsh') ||
      file.name.endsWith('.squashfs'),
    { message: 'only .zip, .sqsh and .squashfs formats are valid' },
  )
  .refine((file) => file.size > 0, {
    message: 'File size should be greater than 0',
  })

export const codeFileSchema = z
  .custom<File>((val) => val instanceof File, 'Required file')
  .refine(
    (file) =>
      file.name.endsWith('.zip') ||
      file.name.endsWith('.sqsh') ||
      file.name.endsWith('.squashfs'),
    { message: 'only .zip, .sqsh and .squashfs formats are valid' },
  )
  .refine((file) => file.size > 0, {
    message: 'File size should be greater than 0',
  })

export const ipfsCIDSchema = requiredStringSchema.regex(
  /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/,
  { message: 'Invalid IPFS CID hash' },
)

export const targetSchema = z.enum([
  EntityDomainType.Instance,
  EntityDomainType.Confidential,
  EntityDomainType.Program,
  EntityDomainType.IPFS,
])

export const paymentMethodSchema = z.enum([
  PaymentMethod.Hold,
  PaymentMethod.Stream,
])

export const blockchainSchema = z.enum([
  BlockchainId.ETH,
  BlockchainId.AVAX,
  BlockchainId.BASE,
  BlockchainId.SOL,
])
