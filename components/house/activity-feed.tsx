"use client"

import { Flame } from "lucide-react"
import { useGame } from "@/lib/game/store"
import type { GameEvent } from "@/lib/game/types"

const KIND_COLOR: Record<GameEvent["kind"], string> = {
  movement: "#35d0e0",
  social: "#ff5c93",
  player: "#f5c451",
  system: "#a97bff",
}

export function ActivityFeed() {
  const { state } = useGame()
  const events = [...state.events].reverse().slice(0, 14)

  return (
    <div className="rounded-2xl border border-border bg-surface/80 p-4">
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-pink" />
        <h2 className="text-base font-semibold">House Buzz</h2>
      </div>

      <ul className="mt-3 flex flex-col gap-2.5">
        {events.length === 0 && (
          <li className="text-sm text-muted">Nothing's happened yet. Press play to let the house breathe.</li>
        )}
        {events.map((e) => (
          <li key={e.id} className="flex gap-3">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ background: KIND_COLOR[e.kind], boxShadow: `0 0 6px ${KIND_COLOR[e.kind]}` }}
            />
            <div className="flex flex-col leading-snug">
              <span className="text-sm text-foreground">{e.text}</span>
              <span className="text-[11px] text-muted">{e.label}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
