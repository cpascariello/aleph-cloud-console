export enum FunctionRuntimeId {
  Runtime1 = '63f07193e6ee9d207b7d1fcf8286f9aee34e6f12f101d2ec77c1229f92964696',
  Runtime3 = '3c238dd3ffba73ab9b2cccb90a11e40e78aff396152de922a6d794a0a65a305e',
  Custom = 'custom',
}

export type FunctionRuntime = {
  id: string
  name: string
  dist: string
}

export const FunctionRuntimes: Record<FunctionRuntimeId, FunctionRuntime> = {
  [FunctionRuntimeId.Runtime1]: {
    id: FunctionRuntimeId.Runtime1,
    name: 'Official runtime with Debian 12, Python 3.12 & Node.js 14',
    dist: 'debian',
  },
  [FunctionRuntimeId.Runtime3]: {
    id: FunctionRuntimeId.Runtime3,
    name: 'Official Node.js LTS runtime (with nvm support)',
    dist: 'debian',
  },
  [FunctionRuntimeId.Custom]: {
    id: FunctionRuntimeId.Custom,
    name: 'Custom runtime',
    dist: 'ubuntu',
  },
}
