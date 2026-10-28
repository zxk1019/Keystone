import type { JSX } from 'react'

// The keystone with a K cut out of it: the same path as the app icon (scripts/make-icons.cjs)
const KEYSTONE =
  'M4.8 5.07Q4.5 3.5 6.1 3.5L17.9 3.5Q19.5 3.5 19.2 5.07L16.6 18.93Q16.3 20.5 14.7 20.5L9.3 20.5Q7.7 20.5 7.4 18.93Z' +
  'M8.75 6.5H10.75V9.58L13.9 6.43L15.31 7.86L11.17 12L15.31 16.14L13.9 17.57L10.75 14.42V17.5H8.75Z'

/** The app's logo in the current text color, sized with className like a lucide icon. */
export default function KeystoneLogo({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path fillRule="evenodd" d={KEYSTONE} />
    </svg>
  )
}
