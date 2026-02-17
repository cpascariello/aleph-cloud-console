import { describe, it, expect } from 'vitest'
import { computeAffordability } from './use-can-afford'

describe('computeAffordability', () => {
  it('returns canAfford true when balance exceeds cost', () => {
    const result = computeAffordability(1000, 500)
    expect(result.canAfford).toBe(true)
    expect(result.deficit).toBe(0)
  })

  it('returns canAfford false when balance is below cost', () => {
    const result = computeAffordability(100, 500)
    expect(result.canAfford).toBe(false)
    expect(result.deficit).toBe(400)
  })

  it('returns canAfford true when balance equals cost', () => {
    const result = computeAffordability(500, 500)
    expect(result.canAfford).toBe(true)
    expect(result.deficit).toBe(0)
  })

  it('returns canAfford false when balance is zero', () => {
    const result = computeAffordability(0, 100)
    expect(result.canAfford).toBe(false)
    expect(result.deficit).toBe(100)
  })

  it('returns canAfford true when cost is undefined', () => {
    const result = computeAffordability(1000, undefined)
    expect(result.canAfford).toBe(true)
    expect(result.deficit).toBe(0)
  })
})
