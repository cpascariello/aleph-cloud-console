import type { PaymentMethod } from '@/constants'

export type CostLine = {
  id: string
  name: string
  label?: string
  detail: string
  cost: number
}

export type CostSummary = {
  paymentMethod: PaymentMethod
  cost: number
  lines: CostLine[]
}

export enum PriceType {
  Instance = 'instance',
  InstanceConfidential = 'instanceConfidential',
  InstanceGpuPremium = 'instanceGpuPremium',
  InstanceGpuStandard = 'instanceGpuStandard',
  Program = 'program',
  ProgramPersistent = 'programPersistent',
  Storage = 'storage',
  Web3Hosting = 'web3Hosting',
}

export type PriceTypeObject = {
  price: {
    storage: {
      payg: string
      holding: string
    }
    computeUnit: {
      payg: string
      holding: string
    }
  }
  tiers: {
    id: string
    computeUnits: number
    model: string
  }[]
  computeUnit: {
    vcpus: number
    diskMib: number
    memoryMib: number
  }
}

export type PricingAggregate = Record<PriceType, PriceTypeObject>

export type SettingsAggregate = {
  compatibleGpus: GPUDevice[]
  communityWalletAddress: string
  communityWalletTimestamp: number
}

export type GPUDevice = {
  vendor: string
  model: string
  device_name?: string
}
