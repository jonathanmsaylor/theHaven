"use client"

import { Sun, Heart, Users, Clock } from "lucide-react"
import { useGame } from "@/lib/game/store"
import { clockToTime, formatTime } from "@/lib/game/clock"

export function StatusBar() {
  const { state } = useGame()
  const t = clockToTime(state.clock)

  return (
    <div className="flex items-center gap-3 overflow-x-auto border-b border-border/60 bg-surface/50 px-4 py-2.5 text-xs [scrollbar-width:none]">
      <Stat icon={<Sun className="h-4 w-4 text-gold" />} label={`Day ${t.day}`} value={formatTime(state.clock)} />
      <Divider />
      <Stat icon={<Heart className="h-4 w-4 text-pink" />} label="Stress" value="42%" />
      <Divider />
      <Stat icon={<Users className="h-4 w-4 text-purple" />} label="Standing" value="Good" />
      <Divider />
      <Stat
        icon={<Clock className="h-4 w-4 text-cyan" />}
        label="Phase"
        value="Social Time"
        accent="text-cyan"
      />
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  accent = "text-foreground",
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {icon}
      <div className="flex flex-col leading-tight">
        <span className={`text-sm font-bold ${accent}`}>{value}</span>
        <span className="text-[10px] text-muted">{label}</span>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-6 w-px shrink-0 bg-border/70" />
}
