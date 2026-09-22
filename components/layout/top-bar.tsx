"use client"

import { Crown, CalendarDays, ChevronRight } from "lucide-react"
import { useGame } from "@/lib/game/store"
import { clockToTime } from "@/lib/game/clock"
import { DAYS_PER_WEEK } from "@/lib/game/clock"

export function TopBar() {
  const { state } = useGame()
  const t = clockToTime(state.clock)
  const daysToCeremony = DAYS_PER_WEEK - t.day

  return (
    <header className="relative border-b border-border/70 bg-gradient-to-b from-black/60 to-transparent px-4 pb-3 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <Crown className="h-4 w-4 text-gold" strokeWidth={2.2} />
            <span className="text-xs font-semibold tracking-[0.35em] text-gold">THE</span>
          </div>
          <h1 className="text-2xl font-black leading-none tracking-[0.18em] text-foreground">
            HAVEN
          </h1>
          <span className="mt-0.5 text-[9px] font-medium tracking-[0.2em] text-muted">
            PEOPLE PLAY DIFFERENT HERE
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[11px] font-medium text-muted">Free Time</span>
          <span className="text-sm font-bold text-foreground">
            Week {t.week} · Day {t.day}
          </span>
          <div className="mt-1.5 flex items-center gap-1.5 rounded-full border border-purple/40 bg-purple/15 px-2.5 py-1">
            <CalendarDays className="h-3.5 w-3.5 text-purple" />
            <span className="text-[11px] font-semibold text-foreground">
              Ceremony {daysToCeremony <= 0 ? "soon" : `${daysToCeremony}d`}
            </span>
            <ChevronRight className="h-3 w-3 text-muted" />
          </div>
        </div>
      </div>
    </header>
  )
}
