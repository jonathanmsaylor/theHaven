// Core domain types for The Haven simulation.
// Game "truth" lives here and in the store — never inside UI components.

export const SCHEMA_VERSION = 1

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
}
