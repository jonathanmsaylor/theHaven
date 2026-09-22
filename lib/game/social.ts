// Deterministic social interaction foundation for Milestone 2A.
//
// This module is the authoritative social engine. It knows nothing about React.
// A future decision service (Jev, LLM) will be able to replace only
// `chooseNpcSocialIntent` — selecting from the finite NpcSocialIntent vocabulary
// — without touching the deterministic validation/mutation in `applyNpcSocial`.

import type {
  Contestant,
  GameState,
  GossipFact,
  InteractionMemory,
  InteractionType,
  NpcRelationshipStore,
  Relationship,
  SocialActivityType,
  SocialGroup,
  SocialInteraction,
  Tone,
  Topic,
} from "./types"
import { formatTime } from "./clock"
import type { Rng } from "./rng"
import { getNpcRel, withNpcDelta } from "./relationships"

export const MAX_MEMORY = 80
export const MAX_INTERACTIONS = 40
export const MAX_GOSSIP = 60

const STRATEGIC_TRAITS = ["Strategic", "Calculating", "Precise", "Ruthless", "Sharp", "Ambitious"]

function groupId(roomId: string): string {
  return `grp_${roomId}`
}

function isAvailable(state: GameState, c: Contestant): boolean {
  if (c.isPlayer) return state.playerInGroup
  return c.socialAvailable
}

/**
 * Recompute social groups purely from room occupancy. At most one group exists
 * per room. Membership ALWAYS equals the set of socially-available contestants
 * physically in that room, so groups can never span rooms. Groups with fewer
 * than two members dissolve. StartedAt is preserved for continuing groups.
 */
export function recomputeGroups(state: GameState, clock: number): SocialGroup[] {
  const prev = new Map(state.socialGroups.map((g) => [g.id, g]))
  const groups: SocialGroup[] = []

  for (const room of state.rooms) {
    const members = state.contestants.filter(
      (c) => c.currentRoomId === room.id && isAvailable(state, c),
    )
    if (members.length < 2) continue

    const id = groupId(room.id)
    const existing = prev.get(id)
    const activityType = deriveActivityType(members, state.npcRelationships)
    groups.push({
      id,
      roomId: room.id,
      memberIds: members.map((m) => m.id),
      activityType,
      startedAt: existing?.startedAt ?? clock,
      lastActivityAt: clock,
    })
  }

  return groups
}

/** Find the group the given contestant currently belongs to, if any. */
export function groupOf(state: GameState, contestantId: string): SocialGroup | undefined {
  return state.socialGroups.find((g) => g.memberIds.includes(contestantId))
}

/** Find the active group in a room, if any. */
export function groupInRoom(state: GameState, roomId: string): SocialGroup | undefined {
  return state.socialGroups.find((g) => g.roomId === roomId)
}

/**
 * Derive the group's finite activity type from members' relationships, traits,
 * mood and social drive. Deterministic — no RNG so it can run every recompute.
 */
export function deriveActivityType(
  members: Contestant[],
  store: NpcRelationshipStore,
): SocialActivityType {
  const npcs = members.filter((m) => !m.isPlayer)
  // Aggregate pairwise signals among NPC members.
  let pairs = 0
  let tensionSum = 0
  let maxAttraction = 0
  let affectionSum = 0
  let familiaritySum = 0
  for (const a of npcs) {
    for (const b of npcs) {
      if (a.id === b.id) continue
      const r = getNpcRel(store, a.id, b.id)
      tensionSum += r.tension
      affectionSum += r.affection
      familiaritySum += r.familiarity
      if (r.attraction > maxAttraction) maxAttraction = r.attraction
      pairs++
    }
  }
  const avgTension = pairs ? tensionSum / pairs : 0
  const avgAffection = pairs ? affectionSum / pairs : 0
  const avgFamiliarity = pairs ? familiaritySum / pairs : 0

  const avgDrive = members.reduce((s, m) => s + m.socialDrive, 0) / members.length
  const anyTense = members.some((m) => m.mood === "tense")
  const strategicCount = members.filter((m) =>
    m.traits.some((t) => STRATEGIC_TRAITS.includes(t)),
  ).length
  const anyFlirty = members.some((m) => m.mood === "flirty")

  if (avgTension >= 45 || anyTense) return "argument"
  if (maxAttraction >= 55 || anyFlirty) return "flirting"
  if (strategicCount >= 2 && avgTension < 35) return "strategizing"
  if (avgDrive < 40) return "quiet_company"
  if (avgFamiliarity >= 45 && avgAffection >= 45) return "conversation"
  // Occasional gossip when familiar but not especially close.
  if (avgFamiliarity >= 35 && avgAffection < 45) return "gossip"
  return "casual_chat"
}

const ACTIVITY_VERB: Record<SocialActivityType, string> = {
  conversation: "Chatting with",
  casual_chat: "Hanging out with",
  gossip: "Trading gossip with",
  strategizing: "Talking strategy with",
  flirting: "Getting flirty with",
  argument: "In a tense back-and-forth with",
  quiet_company: "Keeping quiet company with",
}

function otherNames(state: GameState, group: SocialGroup, selfId: string): string {
  const names = group.memberIds
    .filter((id) => id !== selfId)
    .map((id) => state.contestants.find((c) => c.id === id))
    .filter((c): c is Contestant => Boolean(c))
    .map((c) => (c.isPlayer ? "you" : c.name))
  if (names.length === 0) return "themselves"
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names[0]} and ${names.length - 1} others`
}

/** Human activity text for a contestant, derived from their live group. */
export function activityTextForGroup(
  state: GameState,
  group: SocialGroup,
  selfId: string,
): string {
  return `${ACTIVITY_VERB[group.activityType]} ${otherNames(state, group, selfId)}`
}

/**
 * Return a NEW contestants array with grouped NPCs' currentActivity text
 * derived from their groups. NPCs not in a group keep whatever solo activity
 * their last decision set. The player's activity is managed by player actions.
 */
export function applyGroupActivity(state: GameState, groups: SocialGroup[]): Contestant[] {
  const memberToGroup = new Map<string, SocialGroup>()
  for (const g of groups) {
    for (const id of g.memberIds) memberToGroup.set(id, g)
  }
  return state.contestants.map((c) => {
    if (c.isPlayer) return c
    const g = memberToGroup.get(c.id)
    if (!g) return c
    return { ...c, currentActivity: activityTextForGroup(state, g, c.id) }
  })
}

// ---------------------------------------------------------------------------
// NPC-to-NPC social events (decision provider + deterministic application).
// ---------------------------------------------------------------------------

export interface NpcSocialIntent {
  type: InteractionType
  targetId: string
  tone: Tone
  topic: Topic
  /** Directional deltas: actor -> target and target -> actor. */
  actorDelta: Partial<Relationship>
  targetDelta: Partial<Relationship>
  /** If set, a gossip item is created about these two subjects. */
  gossipAbout?: { subjectA: string; subjectB: string; fact: GossipFact }
}

export function toneFor(activity: SocialActivityType, rel: Relationship): Tone {
  if (activity === "argument") return "tense"
  if (activity === "flirting") return "flirty"
  if (activity === "strategizing") return "strategic"
  if (activity === "gossip") return "guarded"
  if (rel.trust >= 55 || rel.affection >= 55) return "friendly"
  if (rel.tension >= 45) return "guarded"
  return "neutral"
}

const TOPIC_FOR_ACTIVITY: Record<SocialActivityType, Topic> = {
  conversation: "personal",
  casual_chat: "general",
  gossip: "gossip",
  strategizing: "strategy",
  flirting: "relationships",
  argument: "house",
  quiet_company: "general",
}

/**
 * Choose what an NPC does socially toward a groupmate. Finite outputs only.
 * This is the seam a future external decision service can replace.
 */
export function chooseNpcSocialIntent(
  actor: Contestant,
  target: Contestant,
  activity: SocialActivityType,
  store: NpcRelationshipStore,
  rng: Rng,
): NpcSocialIntent {
  const rel = getNpcRel(store, actor.id, target.id)
  const tone = toneFor(activity, rel)
  const topic = TOPIC_FOR_ACTIVITY[activity]

  switch (activity) {
    case "argument":
      return {
        type: "confront",
        targetId: target.id,
        tone,
        topic,
        actorDelta: { tension: rng.int(2, 5), trust: -rng.int(1, 3) },
        targetDelta: { tension: rng.int(2, 5), trust: -rng.int(1, 3), respect: rng.chance(0.5) ? 1 : -1 },
      }
    case "flirting":
      return {
        type: "flirt",
        targetId: target.id,
        tone,
        topic,
        actorDelta: { attraction: rng.int(1, 4), affection: rng.int(0, 2) },
        targetDelta: { attraction: rng.int(0, 3), affection: rng.int(0, 2), tension: rng.chance(0.3) ? 1 : 0 },
      }
    case "strategizing":
      return {
        type: "strategize",
        targetId: target.id,
        tone,
        topic,
        actorDelta: { trust: rng.int(1, 3), familiarity: rng.int(1, 2) },
        targetDelta: { trust: rng.int(1, 3), familiarity: rng.int(1, 2) },
      }
    case "gossip": {
      // Gossip about a third party pulled from the actor's relationships.
      const others = Object.keys(store[actor.id] ?? {}).filter(
        (id) => id !== target.id,
      )
      let gossipAbout: NpcSocialIntent["gossipAbout"]
      if (others.length > 0) {
        const subjectB = rng.pick(others)
        const r = getNpcRel(store, actor.id, subjectB)
        const fact: GossipFact =
          r.tension >= 45 ? "distrusts" : r.affection >= 55 ? "close_to" : "likes"
        gossipAbout = { subjectA: actor.id, subjectB, fact }
      }
      return {
        type: "gossip",
        targetId: target.id,
        tone,
        topic,
        actorDelta: { familiarity: rng.int(1, 2) },
        targetDelta: { familiarity: rng.int(1, 2), trust: -rng.int(0, 1) },
        gossipAbout,
      }
    }
    case "quiet_company":
      return {
        type: "quiet_company",
        targetId: target.id,
        tone,
        topic,
        actorDelta: { familiarity: rng.int(0, 1) },
        targetDelta: { familiarity: rng.int(0, 1) },
      }
    case "conversation":
    case "casual_chat":
    default:
      return {
        type: activity === "conversation" ? "talk" : "casual_chat",
        targetId: target.id,
        tone,
        topic,
        actorDelta: { familiarity: rng.int(1, 3), trust: rng.chance(0.4) ? 1 : 0 },
        targetDelta: { familiarity: rng.int(1, 3), trust: rng.chance(0.4) ? 1 : 0 },
      }
  }
}

function sentimentFor(type: InteractionType): InteractionMemory["sentiment"] {
  if (type === "confront") return "negative"
  if (type === "flirt" || type === "compliment" || type === "talk") return "positive"
  return "neutral"
}

export interface SocialEventResult {
  npcRelationships: NpcRelationshipStore
  interaction: SocialInteraction
  memory: InteractionMemory
  gossip?: GameState["gossip"][number]
  /** Player-facing buzz text, only when the player could plausibly notice it. */
  buzzText?: string
}

/**
 * Apply an NPC social intent deterministically. Pure: returns the mutated
 * social sub-state without touching React or global state.
 */
export function applyNpcSocial(
  state: GameState,
  actor: Contestant,
  intent: NpcSocialIntent,
  clock: number,
  seq: number,
): SocialEventResult {
  const target = state.contestants.find((c) => c.id === intent.targetId)!
  const roomId = actor.currentRoomId

  let store = withNpcDelta(state.npcRelationships, actor.id, target.id, intent.actorDelta)
  store = withNpcDelta(store, target.id, actor.id, intent.targetDelta)

  // Everyone physically in the room witnesses the exchange.
  const witnessedByIds = state.contestants
    .filter((c) => c.currentRoomId === roomId)
    .map((c) => c.id)

  const interaction: SocialInteraction = {
    id: `si_${clock}_${seq}`,
    type: intent.type,
    participantIds: [actor.id, target.id],
    roomId,
    startedAt: clock,
    endedAt: clock,
    topic: intent.topic,
    tone: intent.tone,
  }

  const summary = summarize(actor.name, target.name, intent.type)
  const memory: InteractionMemory = {
    id: `im_${clock}_${seq}`,
    actorIds: [actor.id, target.id],
    type: intent.type,
    timestamp: clock,
    sentiment: sentimentFor(intent.type),
    relationshipEffects: {
      [actor.id]: { [target.id]: intent.actorDelta },
      [target.id]: { [actor.id]: intent.targetDelta },
    },
    witnessedByIds,
    summary,
  }

  let gossip: SocialEventResult["gossip"]
  if (intent.gossipAbout) {
    const { subjectA, subjectB, fact } = intent.gossipAbout
    const real = getNpcRel(store, subjectA, subjectB)
    // Truth is judged against the underlying relationship reality.
    const matches =
      (fact === "distrusts" && real.tension >= 40) ||
      (fact === "close_to" && real.affection >= 50) ||
      (fact === "likes" && real.affection >= 40)
    const truth = matches ? "true" : "exaggerated"
    gossip = {
      id: `gp_${clock}_${seq}`,
      subjectIds: [subjectA, subjectB],
      fact,
      source: actor.id,
      truth,
      knownByIds: [actor.id, target.id],
      originatedAt: clock,
    }
  }

  // The player only gets a buzz line when they're in the room.
  let buzzText: string | undefined
  if (witnessedByIds.includes("player")) {
    buzzText = playerFacingBuzz(state, actor.name, target.name, intent)
  }

  return { npcRelationships: store, interaction, memory, gossip, buzzText }
}

function summarize(actorName: string, targetName: string, type: InteractionType): string {
  switch (type) {
    case "confront":
      return `${actorName} confronted ${targetName}`
    case "flirt":
      return `${actorName} flirted with ${targetName}`
    case "gossip":
      return `${actorName} gossiped with ${targetName}`
    case "strategize":
      return `${actorName} talked strategy with ${targetName}`
    case "quiet_company":
      return `${actorName} spent quiet time with ${targetName}`
    case "compliment":
      return `${actorName} complimented ${targetName}`
    case "casual_chat":
      return `${actorName} chatted with ${targetName}`
    default:
      return `${actorName} talked with ${targetName}`
  }
}

function playerFacingBuzz(
  state: GameState,
  actorName: string,
  targetName: string,
  intent: NpcSocialIntent,
): string {
  const t = targetName === "You" ? "you" : targetName
  switch (intent.type) {
    case "confront":
      return `${actorName} and ${t} got into it — the mood turned tense.`
    case "flirt":
      return `${actorName} seemed to be flirting with ${t}.`
    case "gossip":
      return `${actorName} was whispering something to ${t}.`
    case "strategize":
      return `${actorName} pulled ${t} aside for a quieter conversation.`
    case "quiet_company":
      return `${actorName} and ${t} shared an easy, quiet moment.`
    default:
      return `${actorName} was chatting with ${t}.`
  }
}

/** Bounded append helper. */
export function boundedPush<T>(arr: T[], item: T, max: number): T[] {
  return [...arr, item].slice(-max)
}

/** Format a memory summary with its time label for DEV/history views. */
export function memoryLine(m: InteractionMemory): string {
  return `${formatTime(m.timestamp)} — ${m.summary}`
}
