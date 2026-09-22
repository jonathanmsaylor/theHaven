import type { Contestant, GameEvent, GameState, Mood, Room } from "./types"
import { formatTime, hourOfDay } from "./clock"
import { Rng } from "./rng"
import { clamp } from "./relationships"
import { PLAYER_ID } from "./seed"

const MAX_EVENTS = 60

function inSleepWindow(hour: number, start: number, end: number): boolean {
  if (start < end) return hour >= start && hour < end
  return hour >= start || hour < end
}

function occupantsOf(state: GameState, roomId: string, exceptId?: string): Contestant[] {
  return state.contestants.filter(
    (c) => c.currentRoomId === roomId && c.id !== exceptId && !c.isPlayer,
  )
}

function roomById(state: GameState, id: string): Room | undefined {
  return state.rooms.find((r) => r.id === id)
}

interface Decision {
  roomId: string
  activity: string
  mood: Mood
  energyDelta: number
  durationMin: number
}

function decide(state: GameState, npc: Contestant, clock: number, rng: Rng): Decision {
  const hour = hourOfDay(clock)
  const s = npc.schedule

  // Sleep takes priority.
  if (inSleepWindow(hour, s.sleepStart, s.sleepEnd)) {
    return {
      roomId: "bedroom",
      activity: "Sleeping",
      mood: "tired",
      energyDelta: 25,
      durationMin: rng.int(80, 140),
    }
  }

  // Meals.
  if (s.mealHours.some((m) => Math.abs(m - hour) === 0)) {
    return {
      roomId: "kitchen",
      activity: rng.pick(["Grabbing a bite", "Eating with the house", "Cooking something up"]),
      mood: "relaxed",
      energyDelta: 10,
      durationMin: rng.int(30, 50),
    }
  }

  // Low energy: rest wherever comfortable.
  if (npc.energy < 28) {
    return {
      roomId: rng.chance(0.5) ? "bedroom" : "patio",
      activity: "Recharging quietly",
      mood: "tired",
      energyDelta: 15,
      durationMin: rng.int(40, 70),
    }
  }

  // Decide between alone time and socializing.
  const socialPull = (npc.socialDrive / 100) * (1 - s.aloneTimePreference)
  const wantsAlone = rng.next() > socialPull + 0.15

  if (wantsAlone) {
    const soloRooms = ["garden", "gym", "bedroom", "diary", "patio"]
    return {
      roomId: rng.pick(soloRooms),
      activity: rng.pick(["Taking a moment", "Thinking things over", "Keeping to themselves"]),
      mood: rng.pick<Mood>(["thoughtful", "relaxed", "neutral"]),
      energyDelta: -4,
      durationMin: rng.int(25, 55),
    }
  }

  // Social: prefer following a liked person, else a preferred social room.
  let targetRoom: string
  const likedPresent = state.contestants.find(
    (c) => npc.preferredPeople.includes(c.id) && !c.isPlayer && c.currentRoomId !== npc.currentRoomId,
  )
  if (likedPresent && rng.chance(0.5)) {
    targetRoom = likedPresent.currentRoomId
  } else {
    // Weight preferred rooms by their social energy.
    const rooms = s.preferredSocialRooms
      .map((id) => roomById(state, id))
      .filter((r): r is Room => Boolean(r))
    targetRoom = rng.weighted(
      rooms.map((r) => r.id),
      rooms.map((r) => r.socialEnergy),
    )
  }

  const others = occupantsOf(state, targetRoom, npc.id)
  let activity: string
  let mood: Mood
  if (others.length === 0) {
    activity = rng.pick(["Settling in", "Waiting to see who shows up", "Soaking up the quiet"])
    mood = "neutral"
  } else if (others.length === 1) {
    activity = `Chatting with ${others[0].name}`
    mood = rng.pick<Mood>(["happy", "relaxed", "energetic"])
  } else {
    activity = `Hanging with ${others[0].name} and ${others.length - 1} other${
      others.length - 1 > 1 ? "s" : ""
    }`
    mood = rng.pick<Mood>(["happy", "energetic", "flirty"])
  }

  return {
    roomId: targetRoom,
    activity,
    mood,
    energyDelta: -6,
    durationMin: rng.int(30, 75),
  }
}

/**
 * Advance the world deterministically up to `targetClock`, processing NPC
 * decisions only when each NPC's scheduled decision time is reached.
 * Returns a new GameState; does not mutate the input.
 */
export function advanceTo(state: GameState, targetClock: number): GameState {
  if (targetClock <= state.clock) return state

  const rng = new Rng(state.rngState)
  const contestants = state.contestants.map((c) => ({ ...c }))
  const events: GameEvent[] = [...state.events]

  // Process decisions in chronological order until we pass the target.
  // Guard against pathological loops with a generous cap.
  let guard = 0
  for (;;) {
    guard++
    if (guard > 5000) break

    // Find the next NPC due for a decision at or before target.
    let soonest: Contestant | undefined
    for (const c of contestants) {
      if (c.isPlayer) continue
      if (c.nextDecisionClock <= targetClock) {
        if (!soonest || c.nextDecisionClock < soonest.nextDecisionClock) {
          soonest = c
        }
      }
    }
    if (!soonest) break

    const clockAt = soonest.nextDecisionClock
    // Build a lightweight snapshot state for occupancy queries at this moment.
    const snapshot: GameState = { ...state, contestants, clock: clockAt }
    const decision = decide(snapshot, soonest, clockAt, rng)

    const movedRoom = decision.roomId !== soonest.currentRoomId
    if (movedRoom) {
      const room = roomById(state, decision.roomId)
      events.push({
        id: `${soonest.id}-${clockAt}-${guard}`,
        clock: clockAt,
        label: formatTime(clockAt),
        text: `${soonest.name} went to the ${room?.name ?? decision.roomId}.`,
        kind: "movement",
      })
    }

    soonest.currentRoomId = decision.roomId
    soonest.currentActivity = decision.activity
    soonest.mood = decision.mood
    soonest.energy = clamp(soonest.energy + decision.energyDelta)
    soonest.nextDecisionClock = clockAt + decision.durationMin

    // Light passive familiarity when an NPC socializes in the player's room.
    if (
      decision.roomId === state.playerRoomId &&
      soonest.relationshipToPlayer &&
      decision.activity.startsWith("Chatting") &&
      rng.chance(0.5)
    ) {
      soonest.relationshipToPlayer = {
        ...soonest.relationshipToPlayer,
        familiarity: clamp(soonest.relationshipToPlayer.familiarity + 1),
      }
    }
  }

  // Trim event history.
  const trimmed = events.slice(-MAX_EVENTS)

  return {
    ...state,
    clock: targetClock,
    contestants,
    events: trimmed,
    rngState: rng.state,
  }
}

export { PLAYER_ID }
