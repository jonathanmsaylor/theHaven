import type { Action } from "./actions"
import type { GameState } from "./types"

export type SuggestionTone = "cyan" | "pink" | "purple" | "gold" | "red" | "green"

export interface Suggestion {
  id: string
  label: string
  sublabel: string
  icon: string
  tone: SuggestionTone
  action: Action
}

// Suggested actions are generated from live state — never a static list.
export function generateSuggestions(state: GameState): Suggestion[] {
  const present = state.contestants.filter(
    (c) => c.currentRoomId === state.playerRoomId && !c.isPlayer,
  )
  const out: Suggestion[] = []

  if (present.length === 0) {
    out.push({
      id: "check",
      label: "Check the room",
      sublabel: "Look around",
      icon: "search",
      tone: "cyan",
      action: { type: "check_room" },
    })
    out.push({
      id: "relax",
      label: "Relax here",
      sublabel: "Recharge a little",
      icon: "coffee",
      tone: "green",
      action: { type: "rest" },
    })
    out.push({
      id: "go-social",
      label: "Find people",
      sublabel: "Head to the living room",
      icon: "users",
      tone: "gold",
      action: { type: "move", roomId: "living_room" },
    })
    return out
  }

  const first = present[0]

  if (present.length === 1) {
    out.push({
      id: "talk",
      label: `Talk to ${first.name}`,
      sublabel: "Have a conversation",
      icon: "message-circle",
      tone: "cyan",
      action: { type: "talk", targetId: first.id },
    })
    out.push({
      id: "compliment",
      label: `Compliment ${first.name}`,
      sublabel: "Boost their mood",
      icon: "heart",
      tone: "pink",
      action: { type: "compliment", targetId: first.id },
    })
    out.push({
      id: "flirt",
      label: `Flirt with ${first.name}`,
      sublabel: "Show interest",
      icon: "flame",
      tone: "pink",
      action: { type: "flirt", targetId: first.id },
    })
    out.push({
      id: "observe",
      label: "Listen in",
      sublabel: "Read the room",
      icon: "ear",
      tone: "purple",
      action: { type: "listen" },
    })
    return out
  }

  // Multiple people present.
  out.push({
    id: "join",
    label: "Join the conversation",
    sublabel: `${present.map((p) => p.name).slice(0, 2).join(" & ")}${
      present.length > 2 ? " +" : ""
    }`,
    icon: "users",
    tone: "cyan",
    action: { type: "talk", targetId: first.id },
  })
  out.push({
    id: "talk-someone",
    label: `Talk to ${first.name}`,
    sublabel: "One on one",
    icon: "message-circle",
    tone: "cyan",
    action: { type: "talk", targetId: first.id },
  })
  out.push({
    id: "listen",
    label: "Listen in",
    sublabel: "Pick up on something",
    icon: "ear",
    tone: "purple",
    action: { type: "listen" },
  })
  out.push({
    id: "leave",
    label: "Leave the room",
    sublabel: "Step away",
    icon: "log-out",
    tone: "gold",
    action: { type: "leave_group" },
  })
  return out
}
