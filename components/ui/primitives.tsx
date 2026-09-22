import type { ReactNode } from "react"

export function Card({
  children,
  className = "",
  glow,
}: {
  children: ReactNode
  className?: string
  glow?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface/80 backdrop-blur-sm ${className}`}
      style={glow ? { boxShadow: `0 0 0 1px ${glow}22, 0 8px 30px ${glow}14` } : undefined}
    >
      {children}
    </div>
  )
}

export function SectionHeader({
  icon,
  title,
  action,
}: {
  icon?: ReactNode
  title: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function Meter({
  value,
  max = 100,
  color = "#a97bff",
  className = "",
}: {
  value: number
  max?: number
  color?: string
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/8 ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}88` }}
      />
    </div>
  )
}

export function Chip({
  children,
  color = "#8a92b2",
}: {
  children: ReactNode
  color?: string
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: `${color}1f`, color, border: `1px solid ${color}44` }}
    >
      {children}
    </span>
  )
}
