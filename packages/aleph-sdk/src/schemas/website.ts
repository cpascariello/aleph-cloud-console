import { z } from 'zod'
import { WebsiteFrameworkId } from '@/constants'
import {
  ipfsCIDSchema,
  paymentMethodSchema,
} from '@/schemas/base'
import { addRestrictedNameAndTagsSchema } from '@/schemas/execution'
import { addDomainsSchema } from '@/schemas/domain'

export const websiteFrameworkSchema = z.enum([
  WebsiteFrameworkId.None,
  WebsiteFrameworkId.Nextjs,
  WebsiteFrameworkId.React,
  WebsiteFrameworkId.Vue,
])

export const websiteFolderSchema = z
  .custom<File[]>(
    (val) =>
      Array.isArray(val)
        ? val.every((v) => v instanceof File)
        : val instanceof File,
    'Required folder',
  )
  .refine((folder) => folder && folder.length > 0, {
    message: 'Folder must contain at least one file',
  })

export const websiteDataSchema = z.object({
  folder: websiteFolderSchema.optional(),
  cid: ipfsCIDSchema,
})

export const websiteSchema = z
  .object({
    framework: websiteFrameworkSchema,
    paymentMethod: paymentMethodSchema,
    payment: z.any().optional(),
    website: websiteDataSchema,
    domains: addDomainsSchema,
    ens: z.string().optional(),
  })
  .merge(addRestrictedNameAndTagsSchema)
