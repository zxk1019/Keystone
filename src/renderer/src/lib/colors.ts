import { SUBJECT_COLORS, type SubjectColor } from '@shared/types'

/** A color nobody uses yet, or the next one round the palette. */
export function suggestColor(used: SubjectColor[]): SubjectColor {
  const taken = new Set(used)
  return (
    SUBJECT_COLORS.find((color) => !taken.has(color)) ??
    SUBJECT_COLORS[used.length % SUBJECT_COLORS.length]
  )
}
