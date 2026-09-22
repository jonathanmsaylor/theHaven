// Deterministic, stateful RNG (mulberry32). Keeping RNG state in game state
// means simulation outcomes are reproducible and testable.

export function nextRandom(state: number): { value: number; state: number } {
  let t = (state + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return { value, state: t >>> 0 }
}

/** A small mutable RNG helper for use within a single simulation step. */
export class Rng {
  state: number
  constructor(state: number) {
    this.state = state >>> 0
  }
  next(): number {
    const r = nextRandom(this.state)
    this.state = r.state
    return r.value
  }
  /** Integer in [min, max]. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
  chance(p: number): boolean {
    return this.next() < p
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }
  /** Weighted pick. weights align with items; must be > 0 total. */
  weighted<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((a, b) => a + b, 0)
    let r = this.next() * total
    for (let i = 0; i < items.length; i++) {
      r -= weights[i]
      if (r <= 0) return items[i]
    }
    return items[items.length - 1]
  }
}
