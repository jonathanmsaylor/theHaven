"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { useGame } from "@/lib/game/store"

export function FeedbackToast() {
  const { lastFeedback } = useGame()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!lastFeedback) return
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 4500)
    return () => clearTimeout(timer)
  }, [lastFeedback])

  if (!lastFeedback || !visible) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex justify-center px-4">
      <div
        className="pointer-events-auto flex max-w-full items-start gap-2.5 rounded-2xl border bg-surface-2/95 px-4 py-3 shadow-2xl backdrop-blur-md"
        style={{ borderColor: lastFeedback.ok ? "#4ade8055" : "#f6604a55" }}
        role="status"
      >
        {lastFeedback.ok ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red" />
        )}
        <p className="whitespace-pre-line text-xs leading-relaxed text-foreground">
          {lastFeedback.text}
        </p>
      </div>
    </div>
  )
}
