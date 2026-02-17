export type PortProtocol = {
  tcp: boolean
  udp: boolean
}

export type AddForwardedPorts = {
  entityHash: string
  ports: Record<number, PortProtocol>
}

export type ForwardedPorts = {
  id: string
  entityHash: string
  ports: Record<number, PortProtocol>
  updated_at: string
  date: string
}
