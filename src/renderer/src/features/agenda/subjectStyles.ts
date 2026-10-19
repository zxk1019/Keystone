import type { Subject, SubjectColor } from '@shared/types'

interface ColorStyle {
  /** Class blocks and item chips: soft background, readable text, strong left border */
  block: string
  /** Swatches and dots */
  solid: string
}

// Written out in full so Tailwind can find every class name in the source
export const SUBJECT_STYLES: Record<SubjectColor, ColorStyle> = {
  red: {
    block:
      'bg-red-100 text-red-950 border-red-500 dark:bg-red-500/20 dark:text-red-100 dark:border-red-400',
    solid: 'bg-red-500'
  },
  orange: {
    block:
      'bg-orange-100 text-orange-950 border-orange-500 dark:bg-orange-500/20 dark:text-orange-100 dark:border-orange-400',
    solid: 'bg-orange-500'
  },
  amber: {
    block:
      'bg-amber-100 text-amber-950 border-amber-500 dark:bg-amber-500/20 dark:text-amber-100 dark:border-amber-400',
    solid: 'bg-amber-500'
  },
  lime: {
    block:
      'bg-lime-100 text-lime-950 border-lime-500 dark:bg-lime-500/20 dark:text-lime-100 dark:border-lime-400',
    solid: 'bg-lime-500'
  },
  emerald: {
    block:
      'bg-emerald-100 text-emerald-950 border-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-100 dark:border-emerald-400',
    solid: 'bg-emerald-500'
  },
  teal: {
    block:
      'bg-teal-100 text-teal-950 border-teal-500 dark:bg-teal-500/20 dark:text-teal-100 dark:border-teal-400',
    solid: 'bg-teal-500'
  },
  cyan: {
    block:
      'bg-cyan-100 text-cyan-950 border-cyan-500 dark:bg-cyan-500/20 dark:text-cyan-100 dark:border-cyan-400',
    solid: 'bg-cyan-500'
  },
  sky: {
    block:
      'bg-sky-100 text-sky-950 border-sky-500 dark:bg-sky-500/20 dark:text-sky-100 dark:border-sky-400',
    solid: 'bg-sky-500'
  },
  blue: {
    block:
      'bg-blue-100 text-blue-950 border-blue-500 dark:bg-blue-500/20 dark:text-blue-100 dark:border-blue-400',
    solid: 'bg-blue-500'
  },
  indigo: {
    block:
      'bg-indigo-100 text-indigo-950 border-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-100 dark:border-indigo-400',
    solid: 'bg-indigo-500'
  },
  violet: {
    block:
      'bg-violet-100 text-violet-950 border-violet-500 dark:bg-violet-500/20 dark:text-violet-100 dark:border-violet-400',
    solid: 'bg-violet-500'
  },
  pink: {
    block:
      'bg-pink-100 text-pink-950 border-pink-500 dark:bg-pink-500/20 dark:text-pink-100 dark:border-pink-400',
    solid: 'bg-pink-500'
  }
}

/** Breaks (recess, lunch) and items without a subject */
export const NEUTRAL_STYLE: ColorStyle = {
  block:
    'bg-zinc-100 text-zinc-700 border-zinc-400 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-500',
  solid: 'bg-zinc-400'
}

export function styleFor(subject: Subject | undefined): ColorStyle {
  return subject ? SUBJECT_STYLES[subject.color] : NEUTRAL_STYLE
}
