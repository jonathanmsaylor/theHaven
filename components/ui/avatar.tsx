import type { Contestant } from "@/lib/game/types"
import { contestantColor, initials, MOOD_META } from "@/lib/game/cosmetics"

const SIZES: Record<string, number> = { xs: 28, sm: 40, md: 56, lg: 72, xl: 104 }

export function Avatar({
  contestant,
  size = "md",
  ring = true,
  showMood = false,
}: {
  contestant: Contestant
  size?: keyof typeof SIZES
  ring?: boolean
  showMood?: boolean
}) {
  const px = SIZES[size]
  const color = contestant.isPlayer ? "#f5c451" : contestantColor(contestant.id)
  const mood = MOOD_META[contestant.mood]

  return (
    <div className="relative shrink-0" style={{ width: px, height: px }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full font-semibold"
        style={{
          background: `linear-gradient(145deg, ${color}33, ${color}11)`,
          border: ring ? `2px solid ${color}` : "none",
          color,
          boxShadow: ring ? `0 0 14px ${color}44` : "none",
          fontSize: px * 0.34,
        }}
      >
        {contestant.isPlayer ? "YOU" : initials(contestant.name)}
      </div>
      {showMood && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2"
          style={{ background: mood.color, borderColor: "#05060d" }}
          title={mood.label}
        />
      )}
    </div>
  )
}
