import type { Mood } from "./types"

// Deterministic accent color per contestant for avatars/rings.
const PALETTE = [
  "#a97bff", // purple
  "#ff5c93", // pink
  "#35d0e0", // cyan
  "#4ade80", // green
  "#f5c451", // gold
  "#f6604a", // red
  "#7aa2ff", // blue
  "#ff9d5c", // orange
  "#e879f9", // magenta
  "#5eead4", // teal
  "#c4b5fd", // lavender
  "#fca5a5", // coral
]

export function contestantColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export const MOOD_META: Record<Mood, { label: string; color: string; emoji?: string }> = {
  happy: { label: "Happy", color: "#4ade80" },
  relaxed: { label: "Relaxed", color: "#5eead4" },
  energetic: { label: "Energetic", color: "#35d0e0" },
  flirty: { label: "Flirty", color: "#ff5c93" },
  thoughtful: { label: "Thoughtful", color: "#a97bff" },
  tense: { label: "Tense", color: "#f6604a" },
  tired: { label: "Tired", color: "#8a92b2" },
  neutral: { label: "Neutral", color: "#f5c451" },
}

export const TONE_COLOR: Record<string, string> = {
  cyan: "#35d0e0",
  pink: "#ff5c93",
  purple: "#a97bff",
  gold: "#f5c451",
  green: "#4ade80",
  red: "#f6604a",
}
