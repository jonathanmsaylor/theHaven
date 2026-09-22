"use client"

import { useState } from "react"
import { X, Bug, Clock, Shuffle, Save, RotateCcw } from "lucide-react"
import { useGame } from "@/lib/game/store"
import { clockToTime, formatTime } from "@/lib/game/clock"

export function DevButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open developer panel"
      className="absolute bottom-[84px] right-3 z-20 flex h-8 items-center gap-1 rounded-full border border-purple/50 bg-purple/90 px-2.5 text-[11px] font-bold text-white shadow-lg"
    >
      <Bug className="h-3.5 w-3.5" />
      DEV
    </button>
  )
}

export function DevPanel({ onClose }: { onClose: () => void }) {
  const { state, skipMinutes, randomizeNpcs, resetSave } = useGame()
  const [showJson, setShowJson] = useState(false)
  const t = clockToTime(state.clock)
  const npcs = state.contestants.filter((c) => !c.isPlayer)

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-background/97 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-purple" />
          <h2 className="text-sm font-bold">Developer Panel</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
        <Section title="Clock & Simulation">
          <Row k="clock (abs min)" v={String(state.clock)} />
          <Row k="game time" v={`W${t.week} D${t.day} ${formatTime(state.clock)}`} />
          <Row k="speed" v={state.speed} />
          <Row k="paused" v={String(state.speed === "paused")} />
          <Row k="phase" v={t.phase} />
          <Row k="rngState" v={String(state.rngState)} />
          <Row k="schemaVersion" v={String(state.schemaVersion)} />
          <Row k="player room" v={state.playerRoomId} />
        </Section>

        <div className="grid grid-cols-2 gap-2">
          <DevAction icon={<Clock className="h-3.5 w-3.5" />} label="+10 minutes" onClick={() => skipMinutes(10)} />
          <DevAction icon={<Clock className="h-3.5 w-3.5" />} label="+1 hour" onClick={() => skipMinutes(60)} />
          <DevAction icon={<Shuffle className="h-3.5 w-3.5" />} label="Randomize NPCs" onClick={randomizeNpcs} />
          <DevAction
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            label="Reset save"
            onClick={resetSave}
            danger
          />
        </div>

        <Section title="NPC State">
          {npcs.map((c) => {
            const room = state.rooms.find((r) => r.id === c.currentRoomId)
            const r = c.relationshipToPlayer
            return (
              <div key={c.id} className="rounded-lg border border-border/70 bg-surface/60 p-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{c.name}</span>
                  <span className="text-muted">
                    {room?.name} · {c.mood} · E{c.energy}
                  </span>
                </div>
                <p className="mt-0.5 text-muted">act: {c.currentActivity}</p>
                <p className="text-muted">goal: {c.currentGoal}</p>
                <p className="text-muted">
                  nextDecision @ {state.clock >= c.nextDecisionClock ? "due" : formatTime(c.nextDecisionClock)}
                </p>
                {r && (
                  <p className="mt-0.5 font-mono text-[10px] text-cyan">
                    T{r.trust} A{r.affection} R{r.respect} X{r.attraction} Tn{r.tension} F{r.familiarity}
                  </p>
                )}
              </div>
            )
          })}
        </Section>

        <Section title="Recent Simulation Events">
          {[...state.events].reverse().slice(0, 12).map((e) => (
            <p key={e.id} className="text-muted">
              <span className="text-gold">{e.label}</span> [{e.kind}] {e.text}
            </p>
          ))}
        </Section>

        <div>
          <button
            type="button"
            onClick={() => setShowJson((s) => !s)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 py-2 font-semibold text-foreground"
          >
            <Save className="h-3.5 w-3.5" />
            {showJson ? "Hide" : "Show"} complete state JSON
          </button>
          {showJson && (
            <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-border bg-black/60 p-3 font-mono text-[10px] leading-relaxed text-green">
              {JSON.stringify(state, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-purple">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{k}</span>
      <span className="font-mono text-foreground">{v}</span>
    </div>
  )
}

function DevAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 font-semibold transition-colors ${
        danger
          ? "border-red/50 bg-red/10 text-red"
          : "border-cyan/40 bg-cyan/10 text-cyan"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
