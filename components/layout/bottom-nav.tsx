"use client"

import { Home, Users, Link2, Trophy, BookOpen, Map, MessagesSquare, Crown } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type TabId =
  | "house"
  | "people"
  | "alliances"
  | "game"
  | "diary"
  | "map"
  | "chat"
  | "ceremony"

interface TabDef {
  id: TabId
  label: string
  icon: LucideIcon
  enabled: boolean
  dot?: boolean
}

export const TABS: TabDef[] = [
  { id: "house", label: "House", icon: Home, enabled: true },
  { id: "people", label: "People", icon: Users, enabled: true },
  { id: "alliances", label: "Alliances", icon: Link2, enabled: false },
  { id: "game", label: "Game", icon: Trophy, enabled: false },
  { id: "diary", label: "Diary", icon: BookOpen, enabled: false },
  { id: "map", label: "Map", icon: Map, enabled: true },
  { id: "chat", label: "Chat", icon: MessagesSquare, enabled: false, dot: true },
  { id: "ceremony", label: "Ceremony", icon: Crown, enabled: false },
]

export function BottomNav({
  active,
  onSelect,
}: {
  active: TabId
  onSelect: (tab: TabId) => void
}) {
  return (
    <nav className="border-t border-border/70 bg-surface/95 backdrop-blur-md">
      <ul className="flex items-stretch justify-between px-1.5 py-2">
        {TABS.map((tab) => {
          const isActive = tab.id === active
          const Icon = tab.icon
          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                disabled={!tab.enabled}
                onClick={() => tab.enabled && onSelect(tab.id)}
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.enabled ? tab.label : `${tab.label} (coming in a later milestone)`}
                className={`relative flex w-full flex-col items-center gap-1 rounded-xl py-1.5 transition-colors ${
                  isActive
                    ? "text-gold"
                    : tab.enabled
                      ? "text-muted hover:text-foreground"
                      : "cursor-not-allowed text-muted/35"
                }`}
              >
                <span className="relative">
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={isActive ? 2.4 : 2}
                    style={isActive ? { filter: "drop-shadow(0 0 6px #f5c45188)" } : undefined}
                  />
                  {tab.dot && tab.enabled && (
                    <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-pink" />
                  )}
                </span>
                <span className="text-[9.5px] font-medium tracking-wide">{tab.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
