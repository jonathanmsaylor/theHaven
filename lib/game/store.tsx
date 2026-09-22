"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { GameState, Speed } from "./types"
import { createInitialState, PLAYER_ID } from "./seed"
import { advanceTo } from "./simulation"
import { applyAction, type Action } from "./actions"
import { parseInput } from "./parser"
import { clearSave, hasSave, loadGame, saveGame } from "./persistence"

const SPEED_FACTOR: Record<Speed, number> = {
  paused: 0,
  "1x": 1, // game-minutes per real second
  "2x": 2,
  "4x": 4,
}

const TICK_MS = 250
const AUTOSAVE_MS = 1500

interface FeedbackMessage {
  id: number
  text: string
  ok: boolean
}

interface GameContextValue {
  state: GameState
  ready: boolean
  hasExistingSave: boolean
  lastFeedback: FeedbackMessage | null
  newGame: () => void
  continueGame: () => void
  resetSave: () => void
  setSpeed: (speed: Speed) => void
  runAction: (action: Action) => void
  submitFreeText: (text: string) => void
  skipMinutes: (minutes: number) => void
  randomizeNpcs: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<GameState>(() => createInitialState())
  const [ready, setReady] = useState(false)
  const [hasExistingSave, setHasExistingSave] = useState(false)
  const [lastFeedback, setLastFeedback] = useState<FeedbackMessage | null>(null)

  const stateRef = useRef(state)
  const accumulatorRef = useRef(0)
  const lastRealRef = useRef<number | null>(null)
  const lastSaveRef = useRef(0)
  const feedbackId = useRef(0)

  const commit = useCallback((next: GameState, opts?: { save?: boolean }) => {
    stateRef.current = next
    setStateRaw(next)
    if (opts?.save) {
      saveGame(next)
      lastSaveRef.current = Date.now()
    }
  }, [])

  // Load existing save on mount (client-only).
  useEffect(() => {
    setHasExistingSave(hasSave())
    const loaded = loadGame()
    if (loaded) {
      // Resume paused so the player is in control.
      commit({ ...loaded, speed: "paused" })
    }
    setReady(true)
  }, [commit])

  // Simulation loop.
  useEffect(() => {
    const interval = setInterval(() => {
      const current = stateRef.current
      const factor = SPEED_FACTOR[current.speed]
      const now = performance.now()

      if (factor === 0) {
        lastRealRef.current = now
        return
      }
      if (lastRealRef.current === null) {
        lastRealRef.current = now
        return
      }

      const elapsedSec = (now - lastRealRef.current) / 1000
      lastRealRef.current = now
      accumulatorRef.current += elapsedSec * factor

      const wholeMinutes = Math.floor(accumulatorRef.current)
      if (wholeMinutes >= 1) {
        accumulatorRef.current -= wholeMinutes
        const advanced = advanceTo(current, current.clock + wholeMinutes)
        stateRef.current = advanced
        setStateRaw(advanced)

        if (Date.now() - lastSaveRef.current > AUTOSAVE_MS) {
          saveGame(advanced)
          lastSaveRef.current = Date.now()
        }
      }
    }, TICK_MS)

    return () => clearInterval(interval)
  }, [])

  const pushFeedback = useCallback((text: string, ok: boolean) => {
    feedbackId.current += 1
    setLastFeedback({ id: feedbackId.current, text, ok })
  }, [])

  const newGame = useCallback(() => {
    const fresh = createInitialState()
    accumulatorRef.current = 0
    lastRealRef.current = null
    commit(fresh, { save: true })
    setHasExistingSave(true)
    pushFeedback("A new season of The Haven begins.", true)
  }, [commit, pushFeedback])

  const continueGame = useCallback(() => {
    const loaded = loadGame()
    if (loaded) {
      commit({ ...loaded, speed: "paused" })
      pushFeedback("Welcome back to the house.", true)
    }
  }, [commit, pushFeedback])

  const resetSave = useCallback(() => {
    clearSave()
    const fresh = createInitialState()
    accumulatorRef.current = 0
    lastRealRef.current = null
    commit(fresh)
    setHasExistingSave(false)
    pushFeedback("Save reset. Fresh house, fresh game.", true)
  }, [commit, pushFeedback])

  const setSpeed = useCallback(
    (speed: Speed) => {
      lastRealRef.current = performance.now()
      accumulatorRef.current = 0
      commit({ ...stateRef.current, speed }, { save: true })
    },
    [commit],
  )

  const runAction = useCallback(
    (action: Action) => {
      const result = applyAction(stateRef.current, action)
      if (result.ok) {
        commit(result.state, { save: true })
      }
      pushFeedback(result.message, result.ok)
    },
    [commit, pushFeedback],
  )

  const submitFreeText = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const parsed = parseInput(trimmed, stateRef.current)
      if (!parsed.recognized || parsed.actions.length === 0) {
        pushFeedback(
          `You consider "${trimmed}", but nothing comes of it. (Try things like "go to the kitchen" or "talk to Luna".)`,
          false,
        )
        return
      }

      let working = stateRef.current
      const messages: string[] = []
      let anySuccess = false
      for (const action of parsed.actions) {
        const result = applyAction(working, action)
        if (result.ok) {
          working = result.state
          anySuccess = true
        }
        messages.push(result.message)
      }
      if (anySuccess) {
        commit(working, { save: true })
      }
      pushFeedback(messages.join(" "), anySuccess)
    },
    [commit, pushFeedback],
  )

  const skipMinutes = useCallback(
    (minutes: number) => {
      const advanced = advanceTo(stateRef.current, stateRef.current.clock + minutes)
      commit(advanced, { save: true })
      pushFeedback(`Skipped ahead ${minutes} minutes.`, true)
    },
    [commit, pushFeedback],
  )

  const randomizeNpcs = useCallback(() => {
    // Force every NPC to re-decide immediately for testing.
    const next: GameState = {
      ...stateRef.current,
      contestants: stateRef.current.contestants.map((c) =>
        c.isPlayer ? c : { ...c, nextDecisionClock: stateRef.current.clock },
      ),
    }
    const advanced = advanceTo(next, next.clock + 1)
    commit(advanced, { save: true })
    pushFeedback("Nudged every contestant to make a fresh move.", true)
  }, [commit, pushFeedback])

  const value: GameContextValue = {
    state,
    ready,
    hasExistingSave,
    lastFeedback,
    newGame,
    continueGame,
    resetSave,
    setSpeed,
    runAction,
    submitFreeText,
    skipMinutes,
    randomizeNpcs,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error("useGame must be used within a GameProvider")
  return ctx
}

export { PLAYER_ID }
