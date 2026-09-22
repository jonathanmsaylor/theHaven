"use client"

import { useState } from "react"
import { useGame } from "@/lib/game/store"
import { BottomNav, type TabId } from "@/components/layout/bottom-nav"
import { TopBar } from "@/components/layout/top-bar"
import { StatusBar } from "@/components/layout/status-bar"
import { HouseScreen } from "@/components/house/house-screen"
import { PeopleScreen } from "@/components/people/people-screen"
import { MapScreen } from "@/components/map/map-screen"
import { ComingSoon } from "./coming-soon"
import { StartScreen } from "./start-screen"
import { FeedbackToast } from "./feedback-toast"
import { DevButton, DevPanel } from "@/components/dev/dev-panel"

const COMING_SOON_TITLES: Partial<Record<TabId, string>> = {
  alliances: "Alliances",
  game: "The Game",
  diary: "Diary Room",
  chat: "Chat",
  ceremony: "Ceremony",
}

export function GameApp() {
  const { ready } = useGame()
  const [started, setStarted] = useState(false)
  const [tab, setTab] = useState<TabId>("house")
  const [devOpen, setDevOpen] = useState(false)

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden border-x border-border/50 bg-background shadow-2xl">
      {!ready ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted">Loading…</div>
      ) : !started ? (
        <StartScreen onStart={() => setStarted(true)} />
      ) : (
        <>
          <DevButton onClick={() => setDevOpen(true)} />
          <TopBar />
          <StatusBar />

          <main className="flex-1 overflow-y-auto pb-2">
            {tab === "house" && <HouseScreen />}
            {tab === "people" && <PeopleScreen />}
            {tab === "map" && <MapScreen />}
            {COMING_SOON_TITLES[tab] && <ComingSoon title={COMING_SOON_TITLES[tab]!} />}
          </main>

          <FeedbackToast />
          <BottomNav active={tab} onSelect={setTab} />

          {devOpen && <DevPanel onClose={() => setDevOpen(false)} />}
        </>
      )}
    </div>
  )
}
