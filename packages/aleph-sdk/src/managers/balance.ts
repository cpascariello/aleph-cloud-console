export class BalanceManager {
  constructor(private apiServer: string) {}

  /**
   * Fetch ALEPH hold balance from the pyaleph API.
   * Works for all chains (ETH, AVAX, BASE, SOL).
   */
  async getHoldBalance(address: string): Promise<number> {
    const response = await fetch(
      `${this.apiServer}/api/v0/addresses/${address}/balance`,
    )

    if (response.status === 404) return 0

    if (!response.ok) {
      throw new Error(
        `Failed to fetch balance: `
        + `${response.status} ${response.statusText}`,
      )
    }

    const data: { balance: number } = await response.json()
    return data.balance
  }
}
