import type { GameState } from "./types"
import { SCHEMA_VERSION } from "./types"

const STORAGE_KEY = "the-haven:save:v1"

type Migration = (state: any) => any

// Registry keyed by the version being migrated FROM.
const MIGRATIONS: Record<number, Migration> = {
  // Example for future use:
  // 1: (s) => ({ ...s, schemaVersion: 2, newField: defaultValue }),
}

function migrate(state: any): GameState | null {
  let s = state
  let guard = 0
  while (s && s.schemaVersion < SCHEMA_VERSION) {
    const migration = MIGRATIONS[s.schemaVersion]
    if (!migration) return null // no path — treat as unloadable
    s = migration(s)
    if (++guard > 50) return null
  }
  if (!s || s.schemaVersion !== SCHEMA_VERSION) return null
  return s as GameState
}

export function saveGame(state: GameState): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable — fail silently; simulation continues in-memory.
  }
}

export function loadGame(): GameState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return migrate(parsed)
  } catch {
    return null
  }
}

export function hasSave(): boolean {
  if (typeof window === "undefined") return false
  return Boolean(window.localStorage.getItem(STORAGE_KEY))
}

export function clearSave(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
