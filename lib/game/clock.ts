import type { GameTime, Phase } from "./types"

export const MINUTES_PER_DAY = 24 * 60
export const DAYS_PER_WEEK = 7

// Week 1, Day 1, 10:00 AM as the absolute starting clock.
export const START_CLOCK = 10 * 60

export function clockToTime(clock: number): GameTime {
  const totalDays = Math.floor(clock / MINUTES_PER_DAY)
  const minutesIntoDay = ((clock % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hour = Math.floor(minutesIntoDay / 60)
  const minute = minutesIntoDay % 60
  const day = (totalDays % DAYS_PER_WEEK) + 1
  const week = Math.floor(totalDays / DAYS_PER_WEEK) + 1
  const phase: Phase = "FREE_TIME"
  return { week, day, hour, minute, phase }
}

export function formatTime(clock: number): string {
  const { hour, minute } = clockToTime(clock)
  const ampm = hour >= 12 ? "PM" : "AM"
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${minute.toString().padStart(2, "0")} ${ampm}`
}

export function hourOfDay(clock: number): number {
  return clockToTime(clock).hour
}
