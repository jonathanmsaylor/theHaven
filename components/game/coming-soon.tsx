"use client"

import { Lock } from "lucide-react"

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface/80 text-purple">
        <Lock className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="max-w-xs text-sm text-muted">
        This system is coming in a later milestone. The foundation is here — alliances, competitions,
        nominations, voting, and ceremonies are on the way.
      </p>
      <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] font-semibold text-muted">
        Coming in a later milestone
      </span>
    </div>
  )
}
