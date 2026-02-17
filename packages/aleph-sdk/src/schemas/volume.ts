import { z } from 'zod'
import {
  linuxPathSchema,
  requiredVolumeNameSchema,
  volumeFileSchema,
  messageHashSchema,
} from '@/schemas/base'
import { VolumeType } from '@/constants'

export const newVolumeSchema = z.object({
  volumeType: z.literal(VolumeType.New),
  file: volumeFileSchema.optional(),
  mountPath: linuxPathSchema.optional(),
  useLatest: z.boolean().optional(),
  size: z.number().optional(),
})

export const existingVolumeSchema = z.object({
  volumeType: z.literal(VolumeType.Existing),
  mountPath: linuxPathSchema,
  refHash: messageHashSchema,
  useLatest: z.boolean(),
  size: z.number().optional(),
})

export const persistentVolumeSchema = z.object({
  volumeType: z.literal(VolumeType.Persistent),
  name: requiredVolumeNameSchema,
  mountPath: linuxPathSchema,
  size: z.number().gt(0),
})

export const addVolumeSchema = z.discriminatedUnion('volumeType', [
  newVolumeSchema,
  existingVolumeSchema,
  persistentVolumeSchema,
])

export const addVolumesSchema = z.array(addVolumeSchema).optional()

export const newIsolatedVolumeSchema = z.object({
  file: volumeFileSchema,
})

export const newIsolatedVolumesSchema = z.array(newIsolatedVolumeSchema)
