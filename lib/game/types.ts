// Core domain types for The Haven simulation.
// Game "truth" lives here and in the store — never inside UI components.

export const SCHEMA_VERSION = 2

export type Speed = "paused" | "1x" | "2x" | "4x"

export type Phase = "FREE_TIME"

export type PrivacyLevel = "low" | "medium" | "high"

export interface RoomId {}

export interface Room {
  id: string
  name: string
  description: string
  privacyLevel: PrivacyLevel
  /** Baseline tendency for social activity in this room (0-100). */
  socialEnergy: number
  /** Icon key used by the UI. */
  icon: string
}

export type Mood =
  | "happy"
  | "relaxed"
  | "energetic"
  | "flirty"
  | "thoughtful"
  | "tense"
  | "tired"
  | "neutral"

export interface Relationship {
  trust: number
  affection: number
  respect: number
  attraction: number
  tension: number
  familiarity: number
}

export interface SchedulePrefs {
  /** [startHour, endHour) during which the contestant prefers to sleep. */
  sleepStart: number
  sleepEnd: number
  /** Hours (24h) around which the contestant likes to eat. */
  mealHours: number[]
  /** Room ids the contestant gravitates toward when socializing. */
  preferredSocialRooms: string[]
  /** 0-1 tendency to seek alone time instead of socializing. */
  aloneTimePreference: number
}

export interface Contestant {
  id: string
  name: string
  age: number
  pronouns: string
  archetype: string
  traits: string[]
  bio: string
  isPlayer: boolean

  currentRoomId: string
  currentActivity: string
  mood: Mood
  energy: number // 0-100
  socialDrive: number // 0-100

  /**
   * Whether this contestant is currently open to being pulled into a room's
   * social group. NPCs toggle this each decision (socializing vs alone time);
   * the player's membership is tracked separately via `GameState.playerInGroup`.
   */
  socialAvailable: boolean

  /** NPC relationship toward the player. Undefined for the player themselves. */
  relationshipToPlayer?: Relationship

  // Private state — only surfaced in DEV mode.
  currentGoal: string
  preferredPeople: string[]
  dislikedPeople: string[]

  schedule: SchedulePrefs

  /** Absolute game-minute at which this NPC next re-evaluates its behavior. */
  nextDecisionClock: number
}

export interface GameEvent {
  id: string
  clock: number
  label: string // human-readable "11:20 AM"
  text: string
  kind: "movement" | "social" | "player" | "system"
}

export interface GameTime {
  week: number
  day: number
  hour: number
  minute: number
  phase: Phase
}

// ---------------------------------------------------------------------------
// Milestone 2A — deterministic social interaction foundation.
// These structures are the authoritative social "truth". The player only ever
// learns a subset of this via the separate PlayerKnowledge layer.
// ---------------------------------------------------------------------------

/** Finite, closed set of supported social activities. Never generate new ones. */
export type SocialActivityType =
  | "conversation"
  | "casual_chat"
  | "gossip"
  | "strategizing"
  | "flirting"
  | "argument"
  | "quiet_company"

/** At most one social group exists per room; its id is stable: `grp_<roomId>`. */
export interface SocialGroup {
  id: string
  roomId: string
  memberIds: string[]
  activityType: SocialActivityType
  startedAt: number
  lastActivityAt: number
}

/** Finite interaction vocabulary shared by player actions and NPC behavior. */
export type InteractionType =
  | "talk"
  | "casual_chat"
  | "compliment"
  | "flirt"
  | "confront"
  | "gossip"
  | "strategize"
  | "quiet_company"
  | "promise"
  | "deal"
  | "listen"
  | "observe"

export type Tone = "friendly" | "neutral" | "guarded" | "flirty" | "tense" | "strategic"

export type Topic =
  | "personal"
  | "house"
  | "relationships"
  | "strategy"
  | "gossip"
  | "competition"
  | "general"

/** A lightweight conversation session. NOT full dialogue yet. */
export interface SocialInteraction {
  id: string
  type: InteractionType
  participantIds: string[]
  roomId: string
  startedAt: number
  endedAt?: number
  topic?: Topic
  tone?: Tone
  outcome?: string
}

export type Sentiment = "positive" | "neutral" | "negative"

/** Bounded, structured record of something that happened between contestants. */
export interface InteractionMemory {
  id: string
  actorIds: string[]
  type: InteractionType
  timestamp: number
  sentiment: Sentiment
  /** Directional relationship deltas keyed by `<fromId>` then `<toId>`. */
  relationshipEffects?: Record<string, Record<string, Partial<Relationship>>>
  witnessedByIds: string[]
  /** Short, structured human summary — not open-ended prose. */
  summary: string
}

/** Finite fact types a piece of gossip can encode. */
export type GossipFact =
  | "likes"
  | "distrusts"
  | "argued_with"
  | "close_to"
  | "targeting"
  | "promised_to"
  | "flirting_with"

export type GossipTruth = "true" | "false" | "exaggerated" | "uncertain"

export interface GossipItem {
  id: string
  /** [subjectA, subjectB] — the people the gossip is about. */
  subjectIds: string[]
  fact: GossipFact
  /** Contestant id who originated it, or "observation" for player-witnessed. */
  source: string
  truth: GossipTruth
  knownByIds: string[]
  originatedAt: number
}

export type PromiseType =
  | "keep_information_private"
  | "spend_time_together"
  | "share_information"
  | "general_support"
  | "avoid_targeting"

export type DealType = "mutual_information" | "mutual_support" | "temporary_trust"

export type PromiseStatus = "active" | "fulfilled" | "broken" | "expired"

/** Structured foundation for promises and deals. Voting/nominations are NOT here. */
export interface PromiseDeal {
  id: string
  kind: "promise" | "deal"
  participantIds: string[]
  type: PromiseType | DealType
  createdAt: number
  status: PromiseStatus
}

/** What the player actually knows — kept strictly separate from world truth. */
export interface PlayerKnowledge {
  witnessedInteractionIds: string[]
  /** Gossip item ids the player treats as known fact (witnessed directly). */
  knownFacts: string[]
  /** Gossip item ids the player suspects but is unsure of. */
  suspectedFacts: string[]
  /** Gossip item ids the player has heard second-hand. */
  learnedGossip: string[]
}

/** Directional contestant-to-contestant relationships: `store[from][to]`. */
export type NpcRelationshipStore = Record<string, Record<string, Relationship>>

export interface GameState {
  schemaVersion: number
  /** Absolute source-of-truth clock, in game-minutes since Week 1 Day 1 00:00. */
  clock: number
  speed: Speed
  playerRoomId: string
  rooms: Room[]
  contestants: Contestant[]
  events: GameEvent[]
  rngState: number
  createdAt: number

  // --- Milestone 2A social state ---
  socialGroups: SocialGroup[]
  /** Whether the player has actively joined the group in their current room. */
  playerInGroup: boolean
  interactions: SocialInteraction[]
  interactionMemory: InteractionMemory[]
  npcRelationships: NpcRelationshipStore
  gossip: GossipItem[]
  promises: PromiseDeal[]
  knowledge: PlayerKnowledge
}
