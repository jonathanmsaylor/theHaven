import type {
  Contestant,
  GameEvent,
  GameState,
  GossipItem,
  InteractionMemory,
  Mood,
  NpcRelationshipStore,
  PlayerKnowledge,
  Room,
  SocialGroup,
  SocialInteraction,
} from "./types"
import { formatTime, hourOfDay } from "./clock"
import { Rng } from "./rng"
import { clamp } from "./relationships"
import { PLAYER_ID } from "./seed"
import {
  applyGroupActivity,
  applyNpcSocial,
  boundedPush,
  chooseNpcSocialIntent,
  MAX_GOSSIP,
  MAX_INTERACTIONS,
  MAX_MEMORY,
  recomputeGroups,
} from "./social"
import { recordWitness } from "./knowledge"

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
  /** Whether this decision makes the NPC available for social grouping. */
  social: boolean
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
      social: false,
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
      social: true,
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
      social: false,
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
      social: false,
    }
  }

  // Social: prefer following a liked person, else avoid a disliked-dominated
  // room, else a preferred social room weighted by its social energy.
  let targetRoom: string
  const likedPresent = state.contestants.find(
    (c) =>
      npc.preferredPeople.includes(c.id) &&
      !c.isPlayer &&
      c.currentRoomId !== npc.currentRoomId,
  )
  if (likedPresent && rng.chance(0.55)) {
    targetRoom = likedPresent.currentRoomId
  } else {
    const rooms = s.preferredSocialRooms
      .map((id) => roomById(state, id))
      .filter((r): r is Room => Boolean(r))
      // Down-weight rooms dominated by disliked people.
      .map((r) => {
        const disliked = occupantsOf(state, r.id, npc.id).filter((o) =>
          npc.dislikedPeople.includes(o.id),
        ).length
        return { r, weight: Math.max(5, r.socialEnergy - disliked * 30) }
      })
    targetRoom = rng.weighted(
      rooms.map((x) => x.r.id),
      rooms.map((x) => x.weight),
    )
  }

  const others = occupantsOf(state, targetRoom, npc.id)
  const mood: Mood =
    others.length === 0
      ? "neutral"
      : rng.pick<Mood>(["happy", "relaxed", "energetic"])

  return {
    // Placeholder — real text is derived from the resulting group.
    roomId: targetRoom,
    activity: others.length === 0 ? "Looking for company" : "Settling in with the group",
    mood,
    energyDelta: -6,
    durationMin: rng.int(35, 80),
    social: true,
  }
}

/**
 * Advance the world deterministically up to `targetClock`, processing NPC
 * decisions only when each NPC's scheduled decision time is reached. Social
 * groups, NPC-to-NPC interactions, gossip, memory and player knowledge are all
 * updated here so the store stays a thin wrapper. Returns a new GameState.
 */
export function advanceTo(state: GameState, targetClock: number): GameState {
  if (targetClock <= state.clock) return state

  const rng = new Rng(state.rngState)
  let contestants = state.contestants.map((c) => ({ ...c }))
  let events: GameEvent[] = [...state.events]
  let socialGroups: SocialGroup[] = state.socialGroups
  let interactions: SocialInteraction[] = state.interactions
  let memory: InteractionMemory[] = state.interactionMemory
  let gossip: GossipItem[] = state.gossip
  let npcRelationships: NpcRelationshipStore = state.npcRelationships
  let knowledge: PlayerKnowledge = state.knowledge
  let seq = 0

  let guard = 0
  for (;;) {
    guard++
    if (guard > 5000) break

    // Find the next NPC due for a decision at or before target.
    let soonestIdx = -1
    let soonestClock = Number.POSITIVE_INFINITY
    for (let i = 0; i < contestants.length; i++) {
      const c = contestants[i]
      if (c.isPlayer) continue
      if (c.nextDecisionClock <= targetClock && c.nextDecisionClock < soonestClock) {
        soonestClock = c.nextDecisionClock
        soonestIdx = i
      }
    }
    if (soonestIdx === -1) break

    const clockAt = soonestClock
    const actorBefore = contestants[soonestIdx]

    // Decide using a snapshot at this moment.
    const snapshot: GameState = {
      ...state,
      contestants,
      socialGroups,
      npcRelationships,
      clock: clockAt,
    }
    const decision = decide(snapshot, actorBefore, clockAt, rng)

    const movedRoom = decision.roomId !== actorBefore.currentRoomId
    const wasInPlayerRoom = actorBefore.currentRoomId === state.playerRoomId
    const nowInPlayerRoom = decision.roomId === state.playerRoomId

    // Only report movement the player could plausibly notice: someone entering
    // or leaving the room the player is in.
    if (movedRoom && (wasInPlayerRoom || nowInPlayerRoom)) {
      const room = roomById(state, decision.roomId)
      const text = nowInPlayerRoom
        ? `${actorBefore.name} came into the ${room?.name ?? decision.roomId}.`
        : `${actorBefore.name} left the room.`
      events = boundedPush(
        events,
        {
          id: `mv_${actorBefore.id}_${clockAt}_${guard}`,
          clock: clockAt,
          label: formatTime(clockAt),
          text,
          kind: "movement",
        },
        MAX_EVENTS,
      )
    }

    // Apply the decision to the actor.
    contestants = contestants.map((c, i) =>
      i === soonestIdx
        ? {
            ...c,
            currentRoomId: decision.roomId,
            currentActivity: decision.activity,
            mood: decision.mood,
            energy: clamp(c.energy + decision.energyDelta),
            socialAvailable: decision.social,
            nextDecisionClock: clockAt + decision.durationMin,
          }
        : c,
    )

    // Recompute groups from the new occupancy, then refresh grouped activity text.
    const afterMove: GameState = {
      ...state,
      contestants,
      socialGroups,
      npcRelationships,
      clock: clockAt,
    }
    socialGroups = recomputeGroups(afterMove, clockAt)
    contestants = applyGroupActivity({ ...afterMove, socialGroups }, socialGroups)

    // NPC social event: if the actor landed in a group, they may interact.
    const actor = contestants[soonestIdx]
    const grp = socialGroups.find((g) => g.memberIds.includes(actor.id))
    if (grp && decision.social && rng.chance(0.62)) {
      const npcPartnerIds = grp.memberIds.filter(
        (id) => id !== actor.id && id !== PLAYER_ID,
      )
      if (npcPartnerIds.length > 0) {
        // Prefer a liked partner when present; otherwise pick deterministically.
        const preferred = npcPartnerIds.filter((id) => actor.preferredPeople.includes(id))
        const pool = preferred.length > 0 && rng.chance(0.6) ? preferred : npcPartnerIds
        const targetId = rng.pick(pool)
        const target = contestants.find((c) => c.id === targetId)!

        const eventState: GameState = {
          ...state,
          contestants,
          socialGroups,
          npcRelationships,
          clock: clockAt,
        }
        const intent = chooseNpcSocialIntent(actor, target, grp.activityType, npcRelationships, rng)
        const result = applyNpcSocial(eventState, actor, intent, clockAt, seq++)

        npcRelationships = result.npcRelationships
        interactions = boundedPush(interactions, result.interaction, MAX_INTERACTIONS)
        memory = boundedPush(memory, result.memory, MAX_MEMORY)
        if (result.gossip) gossip = boundedPush(gossip, result.gossip, MAX_GOSSIP)
        if (result.buzzText) {
          events = boundedPush(
            events,
            {
              id: `so_${clockAt}_${seq}`,
              clock: clockAt,
              label: formatTime(clockAt),
              text: result.buzzText,
              kind: "social",
            },
            MAX_EVENTS,
          )
        }
        if (result.memory.witnessedByIds.includes(PLAYER_ID)) {
          knowledge = recordWitness(knowledge, result.interaction.id)
        }
      } else if (grp.memberIds.includes(PLAYER_ID)) {
        // The actor's only companion is the player — a light, passive beat.
        contestants = contestants.map((c, i) => {
          if (i !== soonestIdx || !c.relationshipToPlayer) return c
          return {
            ...c,
            relationshipToPlayer: {
              ...c.relationshipToPlayer,
              familiarity: clamp(c.relationshipToPlayer.familiarity + 1),
            },
          }
        })
        if (rng.chance(0.3)) {
          events = boundedPush(
            events,
            {
              id: `so_${clockAt}_${seq++}`,
              clock: clockAt,
              label: formatTime(clockAt),
              text: `${actor.name} spent a little time with you.`,
              kind: "social",
            },
            MAX_EVENTS,
          )
        }
      }
    }
  }

  return {
    ...state,
    clock: targetClock,
    contestants,
    events,
    socialGroups,
    interactions,
    interactionMemory: memory,
    gossip,
    npcRelationships,
    knowledge,
    rngState: rng.state,
  }
}

export { PLAYER_ID }
