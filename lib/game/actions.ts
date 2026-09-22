import type { Contestant, GameEvent, GameState } from "./types"
import { formatTime } from "./clock"
import { Rng } from "./rng"
import { applyDelta, clamp } from "./relationships"
import { PLAYER_ID } from "./seed"

export type ActionType =
  | "move"
  | "talk"
  | "observe"
  | "listen"
  | "wait"
  | "rest"
  | "eat"
  | "join_group"
  | "leave_group"
  | "compliment"
  | "gossip"
  | "flirt"
  | "confront"
  | "check_room"

export interface Action {
  type: ActionType
  targetId?: string // contestant id
  roomId?: string
  raw?: string
}

export interface ActionResult {
  state: GameState
  ok: boolean
  message: string
}

const MAX_EVENTS = 60

function player(state: GameState): Contestant {
  return state.contestants.find((c) => c.id === PLAYER_ID)!
}

function pushEvent(events: GameEvent[], state: GameState, text: string, kind: GameEvent["kind"]): GameEvent[] {
  const e: GameEvent = {
    id: `player-${state.clock}-${events.length}`,
    clock: state.clock,
    label: formatTime(state.clock),
    text,
    kind,
  }
  return [...events, e].slice(-MAX_EVENTS)
}

function updateContestant(
  state: GameState,
  id: string,
  updater: (c: Contestant) => Contestant,
): Contestant[] {
  return state.contestants.map((c) => (c.id === id ? updater(c) : c))
}

function fail(state: GameState, message: string): ActionResult {
  return { state, ok: false, message }
}

/**
 * Apply a validated player action. Invalid/impossible actions return ok:false
 * and DO NOT mutate world state — this is the deterministic authority layer.
 */
export function applyAction(state: GameState, action: Action): ActionResult {
  switch (action.type) {
    case "move":
    case "join_group":
      return doMove(state, action)
    case "leave_group":
      return doLeaveGroup(state)
    case "talk":
      return doSocial(state, action, "talk")
    case "compliment":
      return doSocial(state, action, "compliment")
    case "flirt":
      return doSocial(state, action, "flirt")
    case "confront":
      return doSocial(state, action, "confront")
    case "gossip":
      return doSocial(state, action, "gossip")
    case "observe":
    case "listen":
      return doObserve(state, action)
    case "check_room":
      return doCheckRoom(state)
    case "rest":
      return doSelf(state, "rest")
    case "eat":
      return doSelf(state, "eat")
    case "wait":
      return doSelf(state, "wait")
    default:
      return fail(state, "You're not sure how to do that.")
  }
}

function doMove(state: GameState, action: Action): ActionResult {
  const room = state.rooms.find((r) => r.id === action.roomId)
  if (!room) return fail(state, "There's no such place in the house.")
  if (room.id === state.playerRoomId) {
    return fail(state, `You're already in the ${room.name}.`)
  }

  const contestants = updateContestant(state, PLAYER_ID, (c) => ({
    ...c,
    currentRoomId: room.id,
    currentActivity: "Just arrived",
  }))
  const events = pushEvent(state.events, state, `You moved to the ${room.name}.`, "player")

  const next: GameState = { ...state, playerRoomId: room.id, contestants, events }

  // If join_group, note who's here.
  const present = next.contestants.filter((c) => c.currentRoomId === room.id && !c.isPlayer)
  const message =
    present.length > 0
      ? `You head to the ${room.name}. ${present.map((p) => p.name).join(", ")} ${
          present.length > 1 ? "are" : "is"
        } here.`
      : `You head to the ${room.name}. It's empty right now.`
  return { state: next, ok: true, message }
}

function doLeaveGroup(state: GameState): ActionResult {
  const p = player(state)
  if (p.currentRoomId === "living_room") {
    // Move to a quieter default.
    return doMove(state, { type: "move", roomId: "garden" })
  }
  return doMove(state, { type: "move", roomId: "living_room" })
}

type SocialKind = "talk" | "compliment" | "flirt" | "confront" | "gossip"

function doSocial(state: GameState, action: Action, kind: SocialKind): ActionResult {
  const target = state.contestants.find((c) => c.id === action.targetId && !c.isPlayer)
  if (!target) return fail(state, "You can't find that person.")
  if (target.currentRoomId !== state.playerRoomId) {
    return fail(state, `${target.name} isn't here. You'll need to find them first.`)
  }
  if (!target.relationshipToPlayer) return fail(state, "You can't interact with them.")

  const rng = new Rng(state.rngState)
  const rel = target.relationshipToPlayer
  let delta: Partial<typeof rel> = {}
  let message = ""
  let activity = ""

  if (kind === "talk") {
    delta = { familiarity: rng.int(2, 4), trust: rng.int(0, 2), tension: -rng.int(0, 1) }
    message = `You have a conversation with ${target.name}. You get to know each other a little better.`
    activity = `Talking with you`
  } else if (kind === "compliment") {
    const insincere = rel.tension > 60 && rng.chance(0.4)
    if (insincere) {
      delta = { tension: rng.int(1, 3) }
      message = `You compliment ${target.name}, but it lands flat — they're not buying it right now.`
    } else {
      delta = { affection: rng.int(2, 5), trust: rng.int(0, 2), tension: -rng.int(0, 2) }
      message = `You compliment ${target.name}. They light up a little.`
    }
    activity = `Chatting with you`
  } else if (kind === "flirt") {
    // Flirting is NOT guaranteed to build attraction.
    const successChance = clamp(0.35 + rel.attraction / 200 - rel.tension / 300, 0.1, 0.85) / 1
    if (rng.next() < successChance) {
      delta = { attraction: rng.int(3, 7), affection: rng.int(1, 4), tension: rng.int(0, 2) }
      message = `You flirt with ${target.name}. There's a spark — they don't look away.`
    } else {
      delta = { tension: rng.int(3, 7), attraction: rng.int(0, 2), affection: -rng.int(0, 3) }
      message = `You flirt with ${target.name}, but it's a little awkward. They pull back slightly.`
    }
    activity = `Getting flirty with you`
  } else if (kind === "confront") {
    const respectDelta = rng.chance(0.5) ? rng.int(1, 4) : -rng.int(1, 4)
    delta = { tension: rng.int(4, 9), trust: -rng.int(2, 6), respect: respectDelta }
    message =
      respectDelta > 0
        ? `You confront ${target.name}. It's tense — but they respect that you said it to their face.`
        : `You confront ${target.name}. The tension in the room spikes.`
    activity = `In a tense moment with you`
  } else {
    // gossip
    delta = { familiarity: rng.int(1, 2), tension: rng.int(0, 3), trust: -rng.int(0, 2) }
    message = `You trade gossip with ${target.name}. Information is currency — but it cuts both ways.`
    activity = `Whispering with you`
  }

  const newRel = applyDelta(rel, delta)
  const contestants = updateContestant(state, target.id, (c) => ({
    ...c,
    relationshipToPlayer: newRel,
    currentActivity: activity,
  }))

  const withContestants: GameState = { ...state, contestants, rngState: rng.state }
  const events = pushEvent(state.events, state, `You ${labelFor(kind)} ${target.name}.`, "player")

  return { state: { ...withContestants, events }, ok: true, message }
}

function labelFor(kind: SocialKind): string {
  switch (kind) {
    case "talk":
      return "talked with"
    case "compliment":
      return "complimented"
    case "flirt":
      return "flirted with"
    case "confront":
      return "confronted"
    case "gossip":
      return "gossiped with"
  }
}

function doObserve(state: GameState, action: Action): ActionResult {
  const present = state.contestants.filter((c) => c.currentRoomId === state.playerRoomId && !c.isPlayer)
  if (present.length === 0) {
    return { state, ok: true, message: "You take in the room, but there's no one around to read." }
  }
  const lines = present.map((p) => `${p.name} is ${p.currentActivity.toLowerCase()} (${p.mood}).`)
  const contestants = updateContestant(state, PLAYER_ID, (c) => ({ ...c, currentActivity: "Watching the room" }))
  return { state: { ...state, contestants }, ok: true, message: `You listen in and read the room:\n${lines.join("\n")}` }
}

function doCheckRoom(state: GameState): ActionResult {
  const room = state.rooms.find((r) => r.id === state.playerRoomId)!
  const present = state.contestants.filter((c) => c.currentRoomId === room.id && !c.isPlayer)
  const who = present.length ? present.map((p) => p.name).join(", ") : "No one else"
  return {
    state,
    ok: true,
    message: `${room.name}: ${room.description}\nHere now: ${who}.`,
  }
}

function doSelf(state: GameState, kind: "rest" | "eat" | "wait"): ActionResult {
  if (kind === "eat" && state.playerRoomId !== "kitchen") {
    return fail(state, "You'd need to head to the kitchen to eat.")
  }
  let activity = "Waiting a moment"
  let message = "You take a beat and let the house move around you."
  let energyDelta = 0
  if (kind === "rest") {
    activity = "Resting"
    message = "You rest and recharge a little."
    energyDelta = 12
  } else if (kind === "eat") {
    activity = "Eating"
    message = "You grab some food in the kitchen."
    energyDelta = 8
  }
  const contestants = updateContestant(state, PLAYER_ID, (c) => ({
    ...c,
    currentActivity: activity,
    energy: clamp(c.energy + energyDelta),
  }))
  return { state: { ...state, contestants }, ok: true, message }
}
