/** Shared look of text inputs, selects and time pickers. */
export const inputClass =
  'rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900'

/** Two or three options shown as one pill, e.g. Week | Month. */
export const segmentedClass = 'inline-flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800'

export function segmentClass(active: boolean): string {
  return `flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
    active
      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-zinc-50'
      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
  }`
}
