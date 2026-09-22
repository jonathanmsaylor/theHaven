"use client"

import { useMemo, useState } from "react"
import { Zap, Send, Pencil } from "lucide-react"
import { useGame } from "@/lib/game/store"
import { generateSuggestions } from "@/lib/game/suggestions"
import { Icon } from "@/components/ui/icon"
import { TONE_COLOR } from "@/lib/game/cosmetics"

export function ActionGrid() {
  const { state, runAction, submitFreeText } = useGame()
  const [text, setText] = useState("")

  const suggestions = useMemo(() => generateSuggestions(state), [state])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    submitFreeText(text)
    setText("")
  }

  return (
    <div className="rounded-2xl border border-border bg-surface/80 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-gold" fill="currentColor" />
          <h2 className="text-base font-semibold">What do you want to do?</h2>
        </div>
        <span className="hidden text-[11px] text-muted sm:block">Use your time wisely.</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {suggestions.map((s) => {
          const color = TONE_COLOR[s.tone]
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => runAction(s.action)}
              className="flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-transform active:scale-[0.98]"
              style={{ borderColor: `${color}55`, background: `${color}12` }}
            >
              <Icon name={s.icon} className="h-5 w-5" strokeWidth={2} />
              <span className="text-sm font-semibold leading-tight text-foreground">
                {s.label}
              </span>
              <span className="text-[11px] leading-tight text-muted">{s.sublabel}</span>
            </button>
          )
        })}
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background/70 px-3">
          <Pencil className="h-4 w-4 shrink-0 text-muted" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.nativeEvent.isComposing &&
                (e.nativeEvent as unknown as { keyCode?: number }).keyCode !== 229
              ) {
                onSubmit(e)
              }
            }}
            placeholder="Or type your own action..."
            aria-label="Type your own action"
            className="h-11 w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
        </div>
        <button
          type="submit"
          aria-label="Do action"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple text-white transition-transform active:scale-95"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
