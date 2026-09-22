"use client"

import { Pause, Play, FastForward, ChevronsRight } from "lucide-react"
import { useGame } from "@/lib/game/store"
import type { Speed } from "@/lib/game/types"
import { formatTime } from "@/lib/game/clock"

const SPEEDS: { id: Speed; label: string }[] = [
  { id: "1x", label: "1x" },
  { id: "2x", label: "2x" },
  { id: "4x", label: "4x" },
]

export function ClockControls() {
  const { state, setSpeed, skipMinutes } = useGame()
  const paused = state.speed === "paused"

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface/80 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-bold tabular-nums text-foreground">
            {formatTime(state.clock)}
          </span>
          <span
            className={`text-[11px] font-semibold ${paused ? "text-muted" : "text-green"}`}
          >
            {paused ? "PAUSED" : `RUNNING ${state.speed}`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSpeed(paused ? "1x" : "paused")}
          aria-label={paused ? "Play" : "Pause"}
          className={`flex h-9 w-11 items-center justify-center rounded-xl border transition-colors ${
            paused
              ? "border-green/50 bg-green/15 text-green"
              : "border-gold/50 bg-gold/15 text-gold"
          }`}
        >
          {paused ? <Play className="h-4 w-4" fill="currentColor" /> : <Pause className="h-4 w-4" fill="currentColor" />}
        </button>

        <div className="flex flex-1 items-center gap-1.5 rounded-xl border border-border bg-background/60 p-1">
          {SPEEDS.map((s) => {
            const active = state.speed === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSpeed(s.id)}
                className={`flex h-7 flex-1 items-center justify-center gap-1 rounded-lg text-xs font-bold transition-colors ${
                  active ? "bg-purple/25 text-purple" : "text-muted hover:text-foreground"
                }`}
              >
                {s.id === "4x" && <FastForward className="h-3 w-3" />}
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SkipButton onClick={() => skipMinutes(30)} label="+30 min" />
        <SkipButton onClick={() => skipMinutes(60)} label="+1 hour" />
      </div>
    </div>
  )
}

function SkipButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border bg-background/60 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-cyan"
    >
      <ChevronsRight className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
