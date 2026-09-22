"use client"

import { useState } from "react"
import { MapPin, Lock, Users, ArrowRight } from "lucide-react"
import { useGame } from "@/lib/game/store"
import { Icon } from "@/components/ui/icon"
import { Avatar } from "@/components/ui/avatar"
import type { PrivacyLevel } from "@/lib/game/types"

const PRIVACY_LABEL: Record<PrivacyLevel, { label: string; color: string; bars: number }> = {
  low: { label: "Low privacy", color: "#f6604a", bars: 1 },
  medium: { label: "Medium privacy", color: "#f5c451", bars: 2 },
  high: { label: "High privacy", color: "#4ade80", bars: 3 },
}

function vibe(social: number) {
  if (social >= 75) return { label: "Lively", bars: 4, color: "#f5c451" }
  if (social >= 55) return { label: "Social", bars: 3, color: "#35d0e0" }
  if (social >= 35) return { label: "Mellow", bars: 2, color: "#a97bff" }
  return { label: "Quiet", bars: 1, color: "#8a92b2" }
}

export function MapScreen() {
  const { state, runAction } = useGame()
  const [selectedId, setSelectedId] = useState<string>(state.playerRoomId)
  const selected = state.rooms.find((r) => r.id === selectedId)!

  const occupants = (roomId: string) =>
    state.contestants.filter((c) => c.currentRoomId === roomId)

  const selectedOccupants = occupants(selected.id)
  const v = vibe(selected.socialEnergy)
  const priv = PRIVACY_LABEL[selected.privacyLevel]

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-gold" />
        <h2 className="text-lg font-bold">House Map</h2>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {state.rooms.map((room) => {
          const people = occupants(room.id)
          const isPlayerHere = room.id === state.playerRoomId
          const isSelected = room.id === selected.id
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => setSelectedId(room.id)}
              className={`flex flex-col gap-2 rounded-2xl border p-3 text-left transition-colors ${
                isSelected ? "border-gold/70 bg-gold/10" : "border-border bg-surface/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon name={room.icon} className="h-4 w-4 text-cyan" />
                  <span className="text-sm font-semibold">{room.name}</span>
                </div>
                {isPlayerHere && (
                  <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold text-gold">
                    YOU
                  </span>
                )}
              </div>

              <div className="flex min-h-7 items-center gap-1">
                {people.slice(0, 5).map((c) => (
                  <Avatar key={c.id} contestant={c} size="xs" ring />
                ))}
                {people.length === 0 && <span className="text-[11px] text-muted">Empty</span>}
              </div>

              <div className="flex items-center gap-1 text-[10px] text-muted">
                <Users className="h-3 w-3" />
                {people.length} here
              </div>
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-border bg-surface/80 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <Icon name={selected.icon} className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">{selected.name}</h3>
            <p className="text-[11px] text-muted">{selected.description}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <VibeBox label="Room Vibe" value={v.label} bars={v.bars} color={v.color} icon={<Users className="h-4 w-4" />} />
          <VibeBox
            label="Privacy"
            value={priv.label.split(" ")[0]}
            bars={priv.bars}
            color={priv.color}
            icon={<Lock className="h-4 w-4" />}
          />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-muted">
            Who&apos;s here ({selectedOccupants.length})
          </p>
          <div className="flex flex-col gap-2">
            {selectedOccupants.length === 0 && (
              <span className="text-sm text-muted">No one is in this room right now.</span>
            )}
            {selectedOccupants.map((c) => (
              <div key={c.id} className="flex items-center gap-2.5">
                <Avatar contestant={c} size="xs" showMood />
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-muted">{c.currentActivity}</span>
              </div>
            ))}
          </div>
        </div>

        {selected.id !== state.playerRoomId && (
          <button
            type="button"
            onClick={() => runAction({ type: "move", roomId: selected.id })}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan/20 py-3 text-sm font-semibold text-cyan transition-transform active:scale-[0.98]"
          >
            Move to {selected.name}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

function VibeBox({
  label,
  value,
  bars,
  color,
  icon,
}: {
  label: string
  value: string
  bars: number
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-3">
      <div className="flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
      <div className="mt-1.5 flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: i < bars ? color : "#ffffff14" }}
          />
        ))}
      </div>
    </div>
  )
}
