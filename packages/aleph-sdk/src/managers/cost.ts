import {
  AlephHttpClient,
  AuthenticatedAlephHttpClient,
} from '@aleph-sdk/client'
import type { PricingAggregate, SettingsAggregate } from '@/types/cost'
import { convertKeysToCamelCase } from '@/utils'

export class CostManager {
  constructor(
    protected sdkClient: AlephHttpClient | AuthenticatedAlephHttpClient,
  ) {}

  protected static readonly aggregateSourceAddress =
    '0xFba561a84A537fCaa567bb7A2257e7142701ae2A'

  async getSettingsAggregate(): Promise<SettingsAggregate> {
    const response = await this.sdkClient.fetchAggregate(
      CostManager.aggregateSourceAddress,
      'settings',
    )

    return convertKeysToCamelCase(response)
  }

  async getPricesAggregate(): Promise<PricingAggregate> {
    const response = await this.sdkClient.fetchAggregate(
      CostManager.aggregateSourceAddress,
      'pricing',
    )

    return convertKeysToCamelCase(response)
  }
}
