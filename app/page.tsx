"use client"

import { GameProvider } from "@/lib/game/store"
import { GameApp } from "@/components/game/game-app"

export default function Page() {
  return (
    <GameProvider>
      <GameApp />
    </GameProvider>
  )
}
