"use client"

import { useState } from "react"
import { Users, ChevronRight } from "lucide-react"
import { useGame } from "@/lib/game/store"
import { Avatar } from "@/components/ui/avatar"
import { MOOD_META } from "@/lib/game/cosmetics"
import { level, relationshipTone } from "@/lib/game/relationships"
import { PersonProfile } from "./person-profile"

export function PeopleScreen() {
  const { state } = useGame()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const npcs = state.contestants.filter((c) => !c.isPlayer)
  const selected = selectedId ? state.contestants.find((c) => c.id === selectedId) : null

  if (selected) {
    return <PersonProfile contestant={selected} onBack={() => setSelectedId(null)} />
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-gold" />
        <h2 className="text-lg font-bold">Contestants</h2>
        <span className="ml-auto text-xs text-muted">{npcs.length} in the house</span>
      </div>

      <ul className="flex flex-col gap-2.5">
        {npcs.map((c) => {
          const mood = MOOD_META[c.mood]
          const room = state.rooms.find((r) => r.id === c.currentRoomId)
          const rel = c.relationshipToPlayer
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface/70 p-3 text-left transition-colors hover:border-border/40"
              >
                <Avatar contestant={c} size="md" showMood />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">{c.name}</span>
                    <span className="text-[11px]" style={{ color: mood.color }}>
                      {mood.label}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted">{c.archetype}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                    <span>{room?.name}</span>
                    {rel && (
                      <>
                        <span className="text-border">·</span>
                        <span className="text-cyan">Trust {level(rel.trust)}</span>
                        <span className="text-border">·</span>
                        <span className="text-pink">{relationshipTone(rel)}</span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
