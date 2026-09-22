"use client"

import { useGame } from "@/lib/game/store"
import { Icon } from "@/components/ui/icon"
import { Avatar } from "@/components/ui/avatar"
import { MOOD_META } from "@/lib/game/cosmetics"
import { ClockControls } from "./clock-controls"
import { ActionGrid } from "./action-grid"
import { ActivityFeed } from "./activity-feed"

export function HouseScreen() {
  const { state } = useGame()
  const room = state.rooms.find((r) => r.id === state.playerRoomId)!
  const present = state.contestants.filter(
    (c) => c.currentRoomId === room.id && !c.isPlayer,
  )

  return (
    <div className="flex flex-col gap-4 p-4">
      <ClockControls />

      <div className="rounded-2xl border border-border bg-surface/80 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <Icon name={room.icon} className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">{room.name}</h2>
            <p className="text-[11px] text-muted">
              You are here · {present.length} other{present.length === 1 ? "" : "s"} present
            </p>
          </div>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-muted">{room.description}</p>

        <div className="mt-3.5 flex flex-col gap-2">
          {present.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-background/40 p-4 text-center text-sm text-muted">
              You have the {room.name.toLowerCase()} to yourself right now.
            </div>
          )}
          {present.map((c) => {
            const mood = MOOD_META[c.mood]
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/40 p-2.5"
              >
                <Avatar contestant={c} size="sm" showMood />
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{c.name}</span>
                    <span className="text-[11px] font-medium" style={{ color: mood.color }}>
                      {mood.label}
                    </span>
                  </div>
                  <span className="truncate text-xs text-muted">{c.currentActivity}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <ActionGrid />

      <ActivityFeed />

      <p className="px-2 text-center text-xs italic text-muted">
        &ldquo;Connections today. Power tomorrow.&rdquo;
      </p>
    </div>
  )
}
