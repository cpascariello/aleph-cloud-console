import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BalanceManager } from './balance'
import { PaymentMethod } from '@/constants'

describe('BalanceManager', () => {
  let manager: BalanceManager

  beforeEach(() => {
    manager = new BalanceManager('https://api.aleph.im')
    vi.restoreAllMocks()
  })

  describe('getHoldBalance', () => {
    it('returns balance from API', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({ balance: 1500.5 }),
          { status: 200 },
        ),
      )

      const balance = await manager.getHoldBalance('0xabc123')
      expect(balance).toBe(1500.5)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.aleph.im/api/v0/addresses/0xabc123/balance',
      )
    })

    it('returns 0 on 404', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('', { status: 404 }),
      )

      const balance = await manager.getHoldBalance('0xunknown')
      expect(balance).toBe(0)
    })

    it('throws on network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new Error('Network error'),
      )

      await expect(
        manager.getHoldBalance('0xabc'),
      ).rejects.toThrow()
    })
  })

  describe('getBalance', () => {
    it('delegates to getHoldBalance for Hold payment', async () => {
      vi.spyOn(manager, 'getHoldBalance').mockResolvedValueOnce(
        1000,
      )

      const balance = await manager.getBalance(
        '0xabc',
        PaymentMethod.Hold,
      )
      expect(balance).toBe(1000)
      expect(manager.getHoldBalance).toHaveBeenCalledWith('0xabc')
    })
  })
})
