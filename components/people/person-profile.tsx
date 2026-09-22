"use client"

import { ChevronLeft, MapPin, Activity } from "lucide-react"
import { useGame } from "@/lib/game/store"
import { Avatar } from "@/components/ui/avatar"
import { Chip } from "@/components/ui/primitives"
import { Icon } from "@/components/ui/icon"
import type { Contestant } from "@/lib/game/types"
import { MOOD_META } from "@/lib/game/cosmetics"
import { currentTone, level, relationshipTone } from "@/lib/game/relationships"
import type { Action } from "@/lib/game/actions"

const QUICK_ACTIONS: { label: string; sub: string; icon: string; tone: string; type: Action["type"] }[] = [
  { label: "Talk", sub: "Have a conversation", icon: "message-circle", tone: "#35d0e0", type: "talk" },
  { label: "Compliment", sub: "Boost their mood", icon: "heart", tone: "#ff5c93", type: "compliment" },
  { label: "Flirt", sub: "Show interest", icon: "flame", tone: "#ff5c93", type: "flirt" },
  { label: "Confront", sub: "Challenge them", icon: "flame", tone: "#f6604a", type: "confront" },
  { label: "Gossip", sub: "Share information", icon: "chat", tone: "#a97bff", type: "gossip" },
  { label: "Observe", sub: "Read them", icon: "ear", tone: "#f5c451", type: "observe" },
]

export function PersonProfile({
  contestant,
  onBack,
}: {
  contestant: Contestant
  onBack: () => void
}) {
  const { state, runAction } = useGame()
  // Always read the freshest copy from state.
  const c = state.contestants.find((x) => x.id === contestant.id) ?? contestant
  const room = state.rooms.find((r) => r.id === c.currentRoomId)
  const mood = MOOD_META[c.mood]
  const rel = c.relationshipToPlayer
  const samePlace = c.currentRoomId === state.playerRoomId

  return (
    <div className="flex flex-col gap-4 p-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 self-start text-sm font-medium text-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All contestants
      </button>

      <div className="rounded-2xl border border-border bg-surface/80 p-4">
        <div className="flex items-center gap-4">
          <Avatar contestant={c} size="xl" showMood />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black leading-tight">{c.name}</h2>
            <p className="text-sm text-muted">
              {c.archetype} · {c.age} · {c.pronouns}
            </p>
            <span
              className="mt-1.5 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: `${mood.color}22`, color: mood.color }}
            >
              {mood.label}
            </span>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted">{c.bio}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {c.traits.map((t) => (
            <Chip key={t} color="#a97bff">
              {t}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoCard icon={<MapPin className="h-4 w-4 text-cyan" />} label="Location" value={room?.name ?? "Unknown"} />
        <InfoCard icon={<Activity className="h-4 w-4 text-pink" />} label="Activity" value={c.currentActivity} />
      </div>

      {rel && (
        <div className="rounded-2xl border border-border bg-surface/80 p-4">
          <h3 className="text-sm font-semibold text-foreground">How they feel about you</h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <RelBox label="Trust" value={level(rel.trust)} color="#35d0e0" />
            <RelBox label="Relationship" value={relationshipTone(rel)} color="#ff5c93" />
            <RelBox label="Familiarity" value={level(rel.familiarity)} color="#a97bff" />
          </div>
          <p className="mt-3 text-xs text-muted">
            Current tone: <span className="font-semibold text-foreground">{currentTone(rel)}</span>
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface/80 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Quick Actions</h3>
          {!samePlace && (
            <span className="text-[11px] text-gold">Not in your room — find them first</span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={!samePlace}
              onClick={() => runAction({ type: a.type, targetId: c.id })}
              className="flex flex-col gap-1 rounded-xl border p-3 text-left transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderColor: `${a.tone}55`, background: `${a.tone}12` }}
            >
              <Icon name={a.icon} className="h-4 w-4" />
              <span className="text-sm font-semibold">{a.label}</span>
              <span className="text-[10px] text-muted">{a.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/80 p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-semibold text-muted">{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  )
}

function RelBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  )
}
