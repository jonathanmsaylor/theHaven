// The player knowledge layer — strictly separate from objective world truth.
//
// Nothing here reads hidden NPC goals or exact hidden relationships. The player
// only accrues knowledge through legitimate mechanics: witnessing interactions,
// listening in, or being told. DEV mode reads world truth directly instead.

import type { GameState, GossipItem, InteractionMemory, PlayerKnowledge } from "./types"
import { PLAYER_ID } from "./seed"

export const MAX_WITNESSED = 120

export function boundedIds(ids: string[], id: string, max = MAX_WITNESSED): string[] {
  if (ids.includes(id)) return ids
  return [...ids, id].slice(-max)
}

/** Record that the player witnessed an interaction. */
export function recordWitness(k: PlayerKnowledge, interactionId: string): PlayerKnowledge {
  return { ...k, witnessedInteractionIds: boundedIds(k.witnessedInteractionIds, interactionId) }
}

export type GossipConfidence = "known" | "suspected" | "heard"

/** Record that the player learned a piece of gossip at some confidence level. */
export function learnGossip(
  k: PlayerKnowledge,
  gossipId: string,
  confidence: GossipConfidence,
): PlayerKnowledge {
  const next: PlayerKnowledge = { ...k }
  if (confidence === "known") next.knownFacts = boundedIds(k.knownFacts, gossipId)
  else if (confidence === "suspected") next.suspectedFacts = boundedIds(k.suspectedFacts, gossipId)
  else next.learnedGossip = boundedIds(k.learnedGossip, gossipId)
  return next
}

function nameOf(state: GameState, id: string): string {
  if (id === PLAYER_ID) return "you"
  return state.contestants.find((c) => c.id === id)?.name ?? "someone"
}

/** Turn a gossip item into an uncertainty-appropriate, player-facing sentence. */
export function describeGossip(state: GameState, g: GossipItem, source?: string): string {
  const [a, b] = g.subjectIds
  const an = nameOf(state, a)
  const bn = nameOf(state, b)
  const claim: Record<GossipItem["fact"], string> = {
    likes: `${an} likes ${bn}`,
    distrusts: `${an} doesn't trust ${bn}`,
    argued_with: `${an} argued with ${bn}`,
    close_to: `${an} is getting close to ${bn}`,
    targeting: `${an} may be targeting ${bn}`,
    promised_to: `${an} made a promise to ${bn}`,
    flirting_with: `${an} has been flirting with ${bn}`,
  }
  const body = claim[g.fact]
  if (source && source !== "observation") {
    const sn = nameOf(state, source)
    return `${sn} says ${body.charAt(0).toLowerCase()}${body.slice(1)}.`
  }
  return `You get the sense that ${body.charAt(0).toLowerCase()}${body.slice(1)}.`
}

/**
 * Build the player-KNOWN context lines about a specific contestant. Derived
 * only from interactions the player witnessed and gossip the player has heard —
 * never from hidden state.
 */
export function knownContextFor(state: GameState, contestantId: string): string[] {
  const lines: string[] = []
  const witnessed = new Set(state.knowledge.witnessedInteractionIds)

  // Direct interactions between the player and this contestant.
  const directMemories = state.interactionMemory.filter(
    (m) =>
      m.actorIds.includes(PLAYER_ID) &&
      m.actorIds.includes(contestantId) &&
      m.witnessedByIds.includes(PLAYER_ID),
  )
  if (directMemories.length >= 4) lines.push("You've spoken many times.")
  else if (directMemories.length >= 2) lines.push("You've spoken a few times.")
  else if (directMemories.length === 1) lines.push("You've spoken once or twice.")

  // Interactions the player witnessed involving this contestant and others.
  const observed = state.interactionMemory
    .filter(
      (m) =>
        m.witnessedByIds.includes(PLAYER_ID) &&
        m.actorIds.includes(contestantId) &&
        !m.actorIds.includes(PLAYER_ID),
    )
    .slice(-3)
  for (const m of observed) {
    lines.push(witnessedLine(state, m, contestantId))
  }

  // Gossip the player knows that concerns this contestant.
  const knownGossipIds = new Set([
    ...state.knowledge.knownFacts,
    ...state.knowledge.suspectedFacts,
    ...state.knowledge.learnedGossip,
  ])
  const relevantGossip = state.gossip
    .filter((g) => knownGossipIds.has(g.id) && g.subjectIds.includes(contestantId))
    .slice(-2)
  for (const g of relevantGossip) {
    lines.push(describeGossip(state, g, g.source))
  }

  return lines.slice(0, 5)
}

function witnessedLine(state: GameState, m: InteractionMemory, focusId: string): string {
  const otherId = m.actorIds.find((id) => id !== focusId)
  const focus = nameOf(state, focusId)
  const other = otherId ? nameOf(state, otherId) : "someone"
  switch (m.type) {
    case "confront":
      return `You saw ${focus} arguing with ${other}.`
    case "flirt":
      return `You noticed ${focus} getting flirty with ${other}.`
    case "gossip":
      return `You caught ${focus} whispering with ${other}.`
    case "strategize":
      return `You saw ${focus} deep in conversation with ${other}.`
    case "quiet_company":
      return `You saw ${focus} spending quiet time with ${other}.`
    default:
      return `You saw ${focus} talking with ${other}.`
  }
}

/** Everything the player currently knows, for the DEV knowledge view. */
export function knowledgeSummary(k: PlayerKnowledge): {
  witnessed: number
  known: number
  suspected: number
  heard: number
} {
  return {
    witnessed: k.witnessedInteractionIds.length,
    known: k.knownFacts.length,
    suspected: k.suspectedFacts.length,
    heard: k.learnedGossip.length,
  }
}
