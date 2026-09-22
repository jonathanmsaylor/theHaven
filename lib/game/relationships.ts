import type { NpcRelationshipStore, Relationship } from "./types"

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n))
}

export function emptyRelationship(): Relationship {
  return { trust: 40, affection: 35, respect: 45, attraction: 20, tension: 15, familiarity: 25 }
}

/** Read a directional relationship (from -> to), defaulting sensibly. */
export function getNpcRel(store: NpcRelationshipStore, from: string, to: string): Relationship {
  return store[from]?.[to] ?? emptyRelationship()
}

/**
 * Return a NEW store with a directional relationship delta applied.
 * Never mutates the input store — keeps state updates pure.
 */
export function withNpcDelta(
  store: NpcRelationshipStore,
  from: string,
  to: string,
  delta: Partial<Relationship>,
): NpcRelationshipStore {
  const current = getNpcRel(store, from, to)
  const next = applyDelta(current, delta)
  return {
    ...store,
    [from]: { ...(store[from] ?? {}), [to]: next },
  }
}

export function applyDelta(
  rel: Relationship,
  delta: Partial<Relationship>,
): Relationship {
  return {
    trust: clamp(rel.trust + (delta.trust ?? 0)),
    affection: clamp(rel.affection + (delta.affection ?? 0)),
    respect: clamp(rel.respect + (delta.respect ?? 0)),
    attraction: clamp(rel.attraction + (delta.attraction ?? 0)),
    tension: clamp(rel.tension + (delta.tension ?? 0)),
    familiarity: clamp(rel.familiarity + (delta.familiarity ?? 0)),
  }
}

// Player-facing qualitative descriptors — exact numbers stay in DEV mode.

export function level(n: number): "Low" | "Moderate" | "High" | "Very High" {
  if (n >= 80) return "Very High"
  if (n >= 55) return "High"
  if (n >= 30) return "Moderate"
  return "Low"
}

export function relationshipTone(rel: Relationship): string {
  if (rel.tension >= 60) return "Hostile"
  if (rel.tension >= 40 && rel.trust < 40) return "Guarded"
  if (rel.attraction >= 60 && rel.affection >= 55) return "Romantic"
  if (rel.affection >= 60 && rel.trust >= 55) return "Warm"
  if (rel.trust >= 55) return "Friendly"
  if (rel.familiarity < 25) return "Distant"
  return "Neutral"
}

export function currentTone(rel: Relationship): string {
  if (rel.tension >= 50) return "Guarded"
  if (rel.affection >= 55 || rel.trust >= 55) return "Open"
  return "Cautious"
}
