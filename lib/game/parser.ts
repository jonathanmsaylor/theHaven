import type { Action, ActionType } from "./actions"
import type { GameState } from "./types"

// Local, deterministic intent interpreter. Free-form language is mapped into a
// FINITE supported action vocabulary. It never invents new game systems.

interface RoomKeyword {
  id: string
  keywords: string[]
}

const ROOM_KEYWORDS: RoomKeyword[] = [
  { id: "living_room", keywords: ["living room", "livingroom", "lounge", "couch", "sofa", "front room"] },
  { id: "kitchen", keywords: ["kitchen", "cook"] },
  { id: "garden", keywords: ["garden", "yard", "outside"] },
  { id: "pool", keywords: ["pool", "swim"] },
  { id: "bedroom", keywords: ["bedroom", "bed wing", "sleeping quarters", "bedroom wing"] },
  { id: "gym", keywords: ["gym", "workout", "weights", "exercise"] },
  { id: "diary", keywords: ["diary room", "diary", "confessional"] },
  { id: "patio", keywords: ["patio", "deck", "terrace"] },
]

const MOVE_VERBS = ["go", "walk", "head", "move", "enter", "visit", "get to", "run to"]
const SOCIAL_VERBS: Record<string, ActionType> = {
  flirt: "flirt",
  "hit on": "flirt",
  compliment: "compliment",
  praise: "compliment",
  hype: "compliment",
  confront: "confront",
  argue: "confront",
  "call out": "confront",
  fight: "confront",
  gossip: "gossip",
  dish: "gossip",
  talk: "talk",
  chat: "talk",
  speak: "talk",
  "say hi": "talk",
  "catch up": "talk",
  "check in": "talk",
}
const OBSERVE_VERBS = ["listen", "observe", "watch", "eavesdrop", "read the room", "read room"]
const REST_VERBS = ["rest", "relax", "nap", "lie down", "lay down", "chill", "take a break"]
const EAT_VERBS = ["eat", "snack", "grab food", "get food", "have a meal"]
const CHECK_VERBS = ["check room", "look around", "explore", "check the room", "scan the room"]
const WAIT_VERBS = ["wait", "stand", "do nothing", "pause"]

export interface ParseResult {
  actions: Action[]
  recognized: boolean
}

function findRoom(text: string): string | null {
  for (const r of ROOM_KEYWORDS) {
    for (const k of r.keywords) {
      if (text.includes(k)) return r.id
    }
  }
  return null
}

function findPerson(text: string, state: GameState): string | null {
  for (const c of state.contestants) {
    if (c.isPlayer) continue
    if (text.includes(c.name.toLowerCase())) return c.id
  }
  return null
}

function includesAny(text: string, list: string[]): string | null {
  for (const item of list) {
    if (text.includes(item)) return item
  }
  return null
}

function socialVerbIn(text: string): ActionType | null {
  for (const key of Object.keys(SOCIAL_VERBS)) {
    if (text.includes(key)) return SOCIAL_VERBS[key]
  }
  return null
}

function parseSegment(seg: string, state: GameState): Action[] {
  const text = seg.trim()
  if (!text) return []
  const actions: Action[] = []

  const roomId = findRoom(text)
  const personId = findPerson(text, state)
  const social = socialVerbIn(text)
  const hasMoveVerb = Boolean(includesAny(text, MOVE_VERBS))
  const observe = Boolean(includesAny(text, OBSERVE_VERBS))
  const rest = Boolean(includesAny(text, REST_VERBS))
  const eat = Boolean(includesAny(text, EAT_VERBS))
  const check = Boolean(includesAny(text, CHECK_VERBS))
  const wait = Boolean(includesAny(text, WAIT_VERBS))

  // Movement first, so a following interaction validates against the new room.
  if (roomId && (hasMoveVerb || personId || social || (!observe && !rest && !eat && !check && !wait))) {
    if (roomId !== state.playerRoomId) {
      actions.push({ type: personId || social ? "join_group" : "move", roomId, raw: text })
    }
  }

  if (personId) {
    actions.push({ type: social ?? "talk", targetId: personId, raw: text })
    return actions
  }

  if (observe) {
    actions.push({ type: "listen", raw: text })
    return actions
  }
  if (check) {
    actions.push({ type: "check_room", raw: text })
    return actions
  }
  if (eat) {
    actions.push({ type: "eat", raw: text })
    return actions
  }
  if (rest) {
    actions.push({ type: "rest", raw: text })
    return actions
  }
  if (wait) {
    actions.push({ type: "wait", raw: text })
    return actions
  }

  return actions
}

export function parseInput(input: string, state: GameState): ParseResult {
  const lowered = input.toLowerCase().trim()
  if (!lowered) return { actions: [], recognized: false }

  // Split compound commands on natural conjunctions.
  const segments = lowered
    .split(/\bthen\b|\band then\b|,|\band\b/g)
    .map((s) => s.trim())
    .filter(Boolean)

  const actions: Action[] = []
  for (const seg of segments) {
    actions.push(...parseSegment(seg, state))
  }

  return { actions, recognized: actions.length > 0 }
}
