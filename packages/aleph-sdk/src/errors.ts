function createError(message: string): Error {
  return new Error(message)
}

const Err = {
  ChainNotYetSupported: createError('Chain not yet supported'),
  BlockchainNotSupported: (chainId: number | string) =>
    createError(`Blockchain not supported: ${chainId}`),
  RequestTimeout: createError('Request timed out'),
  RequestFailed: (cause: unknown) =>
    createError(
      `Request failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    ),
  InvalidResponse: createError('Invalid response'),
  InvalidAccount: createError('Invalid or missing account'),
  InvalidParameter: (param: string) =>
    createError(`Invalid parameter: ${param}`),
  ManagerNotReady: createError('Manager not ready'),
  MethodNotImplemented: createError('Method not implemented'),
  ConnectYourWallet: createError('Please connect your wallet'),
  ConnectYourPaymentWallet: createError(
    'Please connect your payment wallet',
  ),
  UserCancelled: createError('User cancelled the operation'),
  InvalidNetwork: createError('Invalid network'),
  InstanceNotFound: createError('Instance not found'),
  ConfidentialNotFound: createError('Confidential instance not found'),
  FunctionNotFound: createError('Function not found'),
  WebsiteNotFound: createError('Website not found'),
  VolumeNotFound: createError('Volume not found'),
  SSHKeyNotFound: createError('SSH key not found'),
  DomainNotFound: createError('Domain not found'),
  InvalidStreamCost: createError('Invalid stream cost'),
  InvalidNode: createError('Invalid node'),
  UnknownType: createError('Unknown entity type'),
  ValidationError: createError('Validation error'),
  FieldError: (field: string, description?: string) =>
    createError(
      `Field error: ${field}${description ? ` - ${description}` : ''}`,
    ),
  InvalidCodeFile: createError('Invalid code file'),
  InvalidCodeType: createError('Invalid code type'),
  InvalidCRNAddress: createError('Invalid CRN address'),
  InvalidCRNSpecs: createError('Invalid CRN specs'),
  InvalidConfidentialNodeRequirements: createError(
    'Invalid confidential node requirements',
  ),
  CustomRuntimeNeeded: createError('Custom runtime is required'),
  ReceivedRequired: createError('Receiver address is required'),
  ReceiverReward: createError('Receiver reward address is required'),
  StreamNotSupported: createError(
    'Stream payment not supported on this chain',
  ),
  MaxFlowRate: createError('Maximum flow rate exceeded'),
  InsufficientBalance: (neededBalance: number) =>
    createError(
      `Insufficient balance. You need at least ${neededBalance} ALEPH`,
    ),
  DomainUsed: (domain: string) =>
    createError(`Domain "${domain}" is already in use`),
  SSHKeysUsed: (sshKey: string) =>
    createError(`SSH key "${sshKey}" is already in use`),
  InstanceStartupFailed: (id: string, error: string) =>
    createError(`Instance ${id} startup failed: ${error}`),
  MissingVolumeData: createError('Missing volume data'),
  MissingNodeData: createError('Missing node data'),
  UnsupportedGPUModel: (gpuModel: string) =>
    createError(`Unsupported GPU model: ${gpuModel}`),
  UnsupportedPaymentMethod: (paymentMethod?: string) =>
    createError(
      `Unsupported payment method${paymentMethod ? `: ${paymentMethod}` : ''}`,
    ),
  NetworkMismatch: (requiredNetwork: string) =>
    createError(
      `Network mismatch. Please switch to ${requiredNetwork}`,
    ),
} as const

export default Err
