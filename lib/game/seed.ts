import type {
  Contestant,
  GameState,
  NpcRelationshipStore,
  PlayerKnowledge,
  Relationship,
  Room,
} from "./types"
import { SCHEMA_VERSION } from "./types"
import { START_CLOCK } from "./clock"
import { clamp, emptyRelationship } from "./relationships"

export const ROOMS: Room[] = [
  {
    id: "living_room",
    name: "Living Room",
    description:
      "The heart of the house. Conversations, connections, and conflict all happen here.",
    privacyLevel: "low",
    socialEnergy: 90,
    icon: "sofa",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    description: "Where meals, gossip, and late-night snacking bring people together.",
    privacyLevel: "low",
    socialEnergy: 70,
    icon: "utensils",
  },
  {
    id: "garden",
    name: "Garden",
    description: "A quieter outdoor retreat for private talks under the palms.",
    privacyLevel: "medium",
    socialEnergy: 50,
    icon: "leaf",
  },
  {
    id: "pool",
    name: "Pool",
    description: "Sun loungers and cool water — equal parts relaxation and spectacle.",
    privacyLevel: "low",
    socialEnergy: 60,
    icon: "waves",
  },
  {
    id: "bedroom",
    name: "Bedroom Wing",
    description: "Shared sleeping quarters. Whispered secrets and pillow-talk alliances.",
    privacyLevel: "medium",
    socialEnergy: 40,
    icon: "bed",
  },
  {
    id: "gym",
    name: "Gym",
    description: "Burn off tension. Sometimes the realest talks happen mid-workout.",
    privacyLevel: "medium",
    socialEnergy: 35,
    icon: "dumbbell",
  },
  {
    id: "diary",
    name: "Diary Room",
    description: "A private space to confess, scheme, and speak your truth to the house.",
    privacyLevel: "high",
    socialEnergy: 10,
    icon: "star",
  },
  {
    id: "patio",
    name: "Patio",
    description: "Open-air lounge for evening drinks and slow-burning drama.",
    privacyLevel: "medium",
    socialEnergy: 55,
    icon: "sun",
  },
]

function rel(over: Partial<Relationship>): Relationship {
  return {
    trust: 40,
    affection: 35,
    respect: 45,
    attraction: 20,
    tension: 15,
    familiarity: 25,
    ...over,
  }
}

// 11 NPCs + the player = 12 contestants.
const NPCS: Omit<Contestant, "nextDecisionClock" | "socialAvailable">[] = [
  {
    id: "marco",
    name: "Marco",
    age: 28,
    pronouns: "he/him",
    archetype: "The Competitor",
    traits: ["Energetic", "Charming", "Strategic"],
    bio: "A natural leader who plays for the long game. Everyone likes Marco — which is exactly the point.",
    isPlayer: false,
    currentRoomId: "living_room",
    currentActivity: "Holding court",
    mood: "energetic",
    energy: 80,
    socialDrive: 85,
    relationshipToPlayer: rel({ trust: 55, respect: 60, attraction: 20, familiarity: 40 }),
    currentGoal: "Build a loyal core alliance",
    preferredPeople: ["ethan", "riley"],
    dislikedPeople: ["sienna"],
    schedule: {
      sleepStart: 1,
      sleepEnd: 8,
      mealHours: [9, 13, 19],
      preferredSocialRooms: ["living_room", "gym", "pool"],
      aloneTimePreference: 0.2,
    },
  },
  {
    id: "luna",
    name: "Luna",
    age: 25,
    pronouns: "she/her",
    archetype: "The Strategist",
    traits: ["Observant", "Warm", "Calculating"],
    bio: "Came for real connections but knows it's a game. She keeps her options open and her enemies closer.",
    isPlayer: false,
    currentRoomId: "living_room",
    currentActivity: "Reading the room",
    mood: "happy",
    energy: 75,
    socialDrive: 70,
    relationshipToPlayer: rel({ trust: 60, affection: 50, familiarity: 45 }),
    currentGoal: "Get closer to a powerful shield",
    preferredPeople: ["sienna", "ethan"],
    dislikedPeople: ["marco"],
    schedule: {
      sleepStart: 0,
      sleepEnd: 8,
      mealHours: [9, 13, 20],
      preferredSocialRooms: ["living_room", "kitchen", "garden"],
      aloneTimePreference: 0.3,
    },
  },
  {
    id: "sienna",
    name: "Sienna",
    age: 26,
    pronouns: "she/her",
    archetype: "The Flirt",
    traits: ["Charismatic", "Playful", "Ambitious"],
    bio: "Confident and always two steps ahead. Sienna knows the power of a smile — and doesn't mind a little drama.",
    isPlayer: false,
    currentRoomId: "garden",
    currentActivity: "Sunning by herself",
    mood: "flirty",
    energy: 70,
    socialDrive: 80,
    relationshipToPlayer: rel({ affection: 55, attraction: 45, tension: 25, familiarity: 40 }),
    currentGoal: "Be seen as more than just a flirt",
    preferredPeople: ["luna"],
    dislikedPeople: ["marco"],
    schedule: {
      sleepStart: 1,
      sleepEnd: 9,
      mealHours: [10, 14, 20],
      preferredSocialRooms: ["garden", "pool", "living_room", "patio"],
      aloneTimePreference: 0.35,
    },
  },
  {
    id: "ethan",
    name: "Ethan",
    age: 27,
    pronouns: "he/him",
    archetype: "The Golden Retriever",
    traits: ["Easygoing", "Loyal", "Honest"],
    bio: "The guy everyone trusts. Ethan wears his heart on his sleeve, which is either his greatest strength or his fatal flaw.",
    isPlayer: false,
    currentRoomId: "living_room",
    currentActivity: "Chatting with Marco",
    mood: "relaxed",
    energy: 65,
    socialDrive: 60,
    relationshipToPlayer: rel({ trust: 65, affection: 45, respect: 55, familiarity: 50 }),
    currentGoal: "Keep the peace and stay likable",
    preferredPeople: ["marco", "luna"],
    dislikedPeople: [],
    schedule: {
      sleepStart: 0,
      sleepEnd: 8,
      mealHours: [8, 13, 19],
      preferredSocialRooms: ["living_room", "kitchen", "pool"],
      aloneTimePreference: 0.25,
    },
  },
  {
    id: "riley",
    name: "Riley",
    age: 24,
    pronouns: "she/her",
    archetype: "The Wildcard",
    traits: ["Intense", "Unpredictable", "Bold"],
    bio: "Riley plays by her own rules. You never quite know where you stand — and she likes it that way.",
    isPlayer: false,
    currentRoomId: "garden",
    currentActivity: "Watching the house",
    mood: "thoughtful",
    energy: 60,
    socialDrive: 55,
    relationshipToPlayer: rel({ trust: 35, respect: 40, tension: 30, familiarity: 30 }),
    currentGoal: "Shake up the obvious power structure",
    preferredPeople: ["kai"],
    dislikedPeople: ["marco"],
    schedule: {
      sleepStart: 2,
      sleepEnd: 9,
      mealHours: [10, 14, 21],
      preferredSocialRooms: ["garden", "patio", "gym"],
      aloneTimePreference: 0.5,
    },
  },
  {
    id: "kai",
    name: "Kai",
    age: 29,
    pronouns: "he/him",
    archetype: "The Charmer",
    traits: ["Smooth", "Confident", "Guarded"],
    bio: "Effortlessly cool and hard to read. Kai gives just enough to keep everyone guessing.",
    isPlayer: false,
    currentRoomId: "gym",
    currentActivity: "Working out",
    mood: "relaxed",
    energy: 85,
    socialDrive: 50,
    relationshipToPlayer: rel({ trust: 40, attraction: 30, familiarity: 20 }),
    currentGoal: "Stay under the radar early",
    preferredPeople: ["riley"],
    dislikedPeople: [],
    schedule: {
      sleepStart: 1,
      sleepEnd: 8,
      mealHours: [9, 13, 19],
      preferredSocialRooms: ["gym", "pool", "patio"],
      aloneTimePreference: 0.4,
    },
  },
  {
    id: "priya",
    name: "Priya",
    age: 26,
    pronouns: "she/her",
    archetype: "The Peacemaker",
    traits: ["Empathetic", "Diplomatic", "Sharp"],
    bio: "Priya keeps the house from imploding — while quietly noting exactly who owes her a favor.",
    isPlayer: false,
    currentRoomId: "kitchen",
    currentActivity: "Making tea",
    mood: "happy",
    energy: 70,
    socialDrive: 65,
    relationshipToPlayer: rel({ trust: 55, affection: 45, respect: 50, familiarity: 35 }),
    currentGoal: "Become everyone's trusted confidante",
    preferredPeople: ["luna", "ethan"],
    dislikedPeople: [],
    schedule: {
      sleepStart: 23,
      sleepEnd: 7,
      mealHours: [8, 12, 18],
      preferredSocialRooms: ["kitchen", "living_room", "garden"],
      aloneTimePreference: 0.25,
    },
  },
  {
    id: "diego",
    name: "Diego",
    age: 30,
    pronouns: "he/him",
    archetype: "The Provider",
    traits: ["Grounded", "Protective", "Stubborn"],
    bio: "The house chef and self-appointed big brother. Diego is steady — until you cross someone he cares about.",
    isPlayer: false,
    currentRoomId: "kitchen",
    currentActivity: "Prepping food",
    mood: "relaxed",
    energy: 72,
    socialDrive: 55,
    relationshipToPlayer: rel({ trust: 50, respect: 55, familiarity: 30 }),
    currentGoal: "Anchor a family-style alliance",
    preferredPeople: ["priya"],
    dislikedPeople: ["kai"],
    schedule: {
      sleepStart: 23,
      sleepEnd: 7,
      mealHours: [8, 12, 18],
      preferredSocialRooms: ["kitchen", "patio", "living_room"],
      aloneTimePreference: 0.3,
    },
  },
  {
    id: "nova",
    name: "Nova",
    age: 23,
    pronouns: "they/them",
    archetype: "The Free Spirit",
    traits: ["Creative", "Impulsive", "Honest"],
    bio: "Nova follows the vibe wherever it goes. Chaotic, magnetic, and impossible to put in a box.",
    isPlayer: false,
    currentRoomId: "pool",
    currentActivity: "Floating in the pool",
    mood: "happy",
    energy: 78,
    socialDrive: 75,
    relationshipToPlayer: rel({ affection: 50, attraction: 25, familiarity: 30 }),
    currentGoal: "Have fun and stir up good chaos",
    preferredPeople: ["sienna", "kai"],
    dislikedPeople: [],
    schedule: {
      sleepStart: 2,
      sleepEnd: 10,
      mealHours: [11, 15, 21],
      preferredSocialRooms: ["pool", "patio", "living_room"],
      aloneTimePreference: 0.3,
    },
  },
  {
    id: "harper",
    name: "Harper",
    age: 27,
    pronouns: "she/her",
    archetype: "The Analyst",
    traits: ["Precise", "Reserved", "Ruthless"],
    bio: "Harper is always counting votes in her head. Cold on the surface, three moves deep underneath.",
    isPlayer: false,
    currentRoomId: "bedroom",
    currentActivity: "Keeping to herself",
    mood: "thoughtful",
    energy: 62,
    socialDrive: 40,
    relationshipToPlayer: rel({ trust: 35, respect: 50, tension: 20, familiarity: 20 }),
    currentGoal: "Quietly control the numbers",
    preferredPeople: ["harper"],
    dislikedPeople: ["nova"],
    schedule: {
      sleepStart: 23,
      sleepEnd: 7,
      mealHours: [8, 13, 19],
      preferredSocialRooms: ["bedroom", "garden", "living_room"],
      aloneTimePreference: 0.6,
    },
  },
  {
    id: "theo",
    name: "Theo",
    age: 25,
    pronouns: "he/him",
    archetype: "The Underdog",
    traits: ["Funny", "Anxious", "Loyal"],
    bio: "The comic relief who's more strategic than he lets on. Theo just wants to prove he belongs here.",
    isPlayer: false,
    currentRoomId: "patio",
    currentActivity: "Cracking jokes",
    mood: "neutral",
    energy: 58,
    socialDrive: 68,
    relationshipToPlayer: rel({ trust: 50, affection: 40, familiarity: 30 }),
    currentGoal: "Latch onto a strong protector",
    preferredPeople: ["ethan", "priya"],
    dislikedPeople: ["harper"],
    schedule: {
      sleepStart: 1,
      sleepEnd: 9,
      mealHours: [10, 14, 20],
      preferredSocialRooms: ["patio", "living_room", "kitchen"],
      aloneTimePreference: 0.25,
    },
  },
]

export const PLAYER_ID = "player"

export function emptyKnowledge(): PlayerKnowledge {
  return {
    witnessedInteractionIds: [],
    knownFacts: [],
    suspectedFacts: [],
    learnedGossip: [],
  }
}

/**
 * Deterministically seed directional contestant-to-contestant relationships
 * from each NPC's preferred/disliked people. Player is excluded — their
 * relationships live on `relationshipToPlayer`.
 */
export function seedNpcRelationships(contestants: Contestant[]): NpcRelationshipStore {
  const npcs = contestants.filter((c) => !c.isPlayer)
  const store: NpcRelationshipStore = {}
  for (const a of npcs) {
    store[a.id] = {}
    for (const b of npcs) {
      if (a.id === b.id) continue
      const base = emptyRelationship()
      let r: Relationship = { ...base, familiarity: 30 }
      if (a.preferredPeople.includes(b.id)) {
        r = {
          ...r,
          trust: clamp(r.trust + 18),
          affection: clamp(r.affection + 16),
          familiarity: clamp(r.familiarity + 15),
          respect: clamp(r.respect + 8),
          tension: clamp(r.tension - 6),
        }
      }
      if (a.dislikedPeople.includes(b.id)) {
        r = {
          ...r,
          tension: clamp(r.tension + 26),
          trust: clamp(r.trust - 16),
          affection: clamp(r.affection - 10),
          respect: clamp(r.respect - 4),
        }
      }
      store[a.id][b.id] = r
    }
  }
  return store
}

export function createInitialState(seed?: number): GameState {
  const rngSeed = seed ?? (Date.now() & 0x7fffffff)

  const player: Contestant = {
    id: PLAYER_ID,
    name: "You",
    age: 26,
    pronouns: "you",
    archetype: "The Player",
    traits: ["Adaptable", "Watchful"],
    bio: "This is you. Every move you make ripples through the house.",
    isPlayer: true,
    currentRoomId: "living_room",
    currentActivity: "Just arrived",
    mood: "neutral",
    energy: 100,
    socialDrive: 70,
    socialAvailable: false,
    currentGoal: "Survive and outplay",
    preferredPeople: [],
    dislikedPeople: [],
    schedule: {
      sleepStart: 0,
      sleepEnd: 8,
      mealHours: [9, 13, 19],
      preferredSocialRooms: ["living_room"],
      aloneTimePreference: 0.3,
    },
    nextDecisionClock: Number.POSITIVE_INFINITY, // player never auto-decides
  }

  const npcs: Contestant[] = NPCS.map((n, i) => ({
    ...n,
    // Stagger initial decisions so NPCs don't all move on the same tick.
    nextDecisionClock: START_CLOCK + 10 + i * 7,
    // Awake and open to socializing at the start of the season.
    socialAvailable: true,
  }))

  const contestants = [player, ...npcs]

  return {
    schemaVersion: SCHEMA_VERSION,
    clock: START_CLOCK,
    speed: "paused",
    playerRoomId: "living_room",
    rooms: ROOMS,
    contestants,
    events: [
      {
        id: "welcome",
        clock: START_CLOCK,
        label: "10:00 AM",
        text: "You step into The Haven. Week 1, Day 1. The game begins.",
        kind: "system",
      },
    ],
    rngState: rngSeed,
    createdAt: Date.now(),

    socialGroups: [],
    playerInGroup: false,
    interactions: [],
    interactionMemory: [],
    npcRelationships: seedNpcRelationships(contestants),
    gossip: [],
    promises: [],
    knowledge: emptyKnowledge(),
  }
}
