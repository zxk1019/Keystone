/** 1_935_000 -> "32:15"; rounds up so the display reaches 0:00 exactly when time is up. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** A moment as "18:05" in the user's language. */
export function formatClock(ms: number, language: string): string {
  return new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(ms)
}
