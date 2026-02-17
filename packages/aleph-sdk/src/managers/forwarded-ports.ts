import { Account } from '@aleph-sdk/account'
import {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import { AggregateManager } from '@/managers/aggregate'
import type {
  PortProtocol,
  AddForwardedPorts,
  ForwardedPorts,
} from '@/types/forwarded-ports'
import type { CheckoutStepType } from '@/constants'
import {
  defaultConsoleChannel,
  defaultPortForwardingAggregateKey,
} from '@/constants'

type EntityPortsConfig = {
  ports: Record<number, PortProtocol>
}

const SYSTEM_PORTS = new Set([22])
const MAX_PORTS_ALLOWED = 20

export class ForwardedPortsManager extends AggregateManager<
  ForwardedPorts,
  AddForwardedPorts,
  EntityPortsConfig
> {
  protected addStepType: CheckoutStepType = 'portForwarding'
  protected delStepType: CheckoutStepType = 'portForwardingDel'

  constructor(
    protected override account: Account | undefined,
    protected override sdkClient:
      | AlephHttpClient
      | AuthenticatedAlephHttpClient,
    protected override key = defaultPortForwardingAggregateKey,
    protected override channel = defaultConsoleChannel,
  ) {
    super(account, sdkClient, key, channel)
  }

  getKeyFromAddEntity(entity: AddForwardedPorts): string {
    return entity.entityHash
  }

  buildAggregateItemContent(
    entity: AddForwardedPorts,
  ): EntityPortsConfig {
    return {
      ports: entity.ports,
    }
  }

  parseEntityFromAggregateItem(
    key: string,
    content: EntityPortsConfig,
  ): Partial<ForwardedPorts> {
    return {
      entityHash: key,
      ports: content.ports,
    }
  }

  async getByEntityHash(
    entityHash: string,
  ): Promise<ForwardedPorts | undefined> {
    const entities = await this.getAll()
    return entities.find(
      (entity) => entity.entityHash === entityHash,
    )
  }

  async delByEntityHash(entityHash: string): Promise<void> {
    await this.del(entityHash)
  }

  async addMultiplePorts(
    entityHash: string,
    newPorts: { port: string; tcp: boolean; udp: boolean }[],
  ): Promise<ForwardedPorts> {
    const existingPorts = await this.getByEntityHash(entityHash)
    const currentPorts = existingPorts?.ports || {}

    const newPortsMap: Record<number, PortProtocol> = {}
    for (const port of newPorts) {
      const portNumber = parseInt(port.port, 10)
      newPortsMap[portNumber] = {
        tcp: port.tcp,
        udp: port.udp,
      }
    }

    const updatedPorts = { ...currentPorts, ...newPortsMap }

    const totalPorts = Object.keys(updatedPorts).length
    if (totalPorts > MAX_PORTS_ALLOWED) {
      throw new Error(
        `Maximum ${MAX_PORTS_ALLOWED} ports allowed. Current total would be ${totalPorts}`,
      )
    }

    const results = await this.add({
      entityHash,
      ports: updatedPorts,
    })

    return results[0]!
  }

  async removePort(
    entityHash: string,
    portSource: string,
  ): Promise<void> {
    const existingPorts = await this.getByEntityHash(entityHash)
    const currentPorts = existingPorts?.ports || {}

    const updatedPorts = { ...currentPorts }
    delete updatedPorts[parseInt(portSource, 10)]

    if (Object.keys(updatedPorts).length > 0) {
      await this.add({
        entityHash,
        ports: updatedPorts,
      })
    } else {
      await this.del(entityHash)
    }
  }

  async syncWithPortStatus(
    entityHash: string,
  ): Promise<ForwardedPorts | undefined> {
    const existingPorts = await this.getByEntityHash(entityHash)
    if (!existingPorts) return undefined

    return existingPorts
  }

  validatePortEntry(port: {
    port: string
    tcp: boolean
    udp: boolean
  }): {
    isValid: boolean
    error?: string
  } {
    const portNumber = parseInt(port.port, 10)

    if (
      isNaN(portNumber) ||
      portNumber < 1 ||
      portNumber > 65535
    ) {
      return {
        isValid: false,
        error: 'Port must be between 1 and 65535',
      }
    }

    if (!port.tcp && !port.udp) {
      return {
        isValid: false,
        error:
          'At least one protocol (TCP or UDP) must be selected',
      }
    }

    if (SYSTEM_PORTS.has(portNumber)) {
      return {
        isValid: false,
        error: `Port ${port.port} is a reserved system port`,
      }
    }

    return { isValid: true }
  }

  async validatePortConflicts(
    entityHash: string,
    newPorts: { port: string; tcp: boolean; udp: boolean }[],
  ): Promise<{ hasConflicts: boolean; conflicts: string[] }> {
    const existingPorts = await this.getByEntityHash(entityHash)
    const currentPorts = existingPorts?.ports || {}
    const conflicts: string[] = []

    for (const newPort of newPorts) {
      const portNumber = parseInt(newPort.port, 10)
      if (currentPorts[portNumber]) {
        conflicts.push(newPort.port)
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    }
  }
}
