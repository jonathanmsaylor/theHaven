"use client"

import { Crown, Play, RotateCcw } from "lucide-react"
import { useGame } from "@/lib/game/store"

export function StartScreen({ onStart }: { onStart: () => void }) {
  const { hasExistingSave, newGame, continueGame, resetSave } = useGame()

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <div className="flex flex-col items-center gap-2">
        <Crown className="h-8 w-8 text-gold" />
        <span className="text-xs font-semibold tracking-[0.4em] text-gold">THE</span>
        <h1 className="text-5xl font-black tracking-[0.15em]">HAVEN</h1>
        <p className="mt-1 text-xs tracking-[0.25em] text-muted">PEOPLE PLAY DIFFERENT HERE</p>
      </div>

      <p className="max-w-sm text-sm leading-relaxed text-muted">
        Twelve strangers. One luxury house. Every conversation is a move. Build alliances, read the
        room, and outplay everyone — but remember, trust is a currency.
      </p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {hasExistingSave && (
          <button
            type="button"
            onClick={() => {
              continueGame()
              onStart()
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gold py-3.5 text-sm font-bold text-black transition-transform active:scale-[0.98]"
          >
            <Play className="h-4 w-4" fill="currentColor" />
            Continue
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            newGame()
            onStart()
          }}
          className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-transform active:scale-[0.98] ${
            hasExistingSave
              ? "border border-border bg-surface/80 text-foreground"
              : "bg-gold text-black"
          }`}
        >
          <Crown className="h-4 w-4" />
          New Game
        </button>

        {hasExistingSave && (
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.confirm("Reset your save? This cannot be undone.")) {
                resetSave()
              }
            }}
            className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-muted hover:text-red"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Save
          </button>
        )}
      </div>
    </div>
  )
}
