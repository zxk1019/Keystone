import { useEffect, useRef, type FormEvent, type JSX, type ReactNode } from 'react'

interface DialogProps {
  title: string
  /** Called when the dialog is dismissed with Esc; the parent then stops rendering it. */
  onClose: () => void
  onSubmit: () => void
  children: ReactNode
  footer: ReactNode
}

/**
 * Modal window built on the native <dialog> element, which already handles Esc and keeps
 * the keyboard focus inside. It opens when rendered and is removed by not rendering it.
 * Mark the first field with `data-autofocus` (React's autoFocus runs before the dialog opens).
 */
export default function Dialog({
  title,
  onClose,
  onSubmit,
  children,
  footer
}: DialogProps): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    // React StrictMode runs effects twice in development, and showModal() throws if already open
    if (!dialog || dialog.open) return
    dialog.showModal()
    // showModal() focuses the first button; move the focus to the field marked to receive it
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [])

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4 p-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          {children}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
          {footer}
        </div>
      </form>
    </dialog>
  )
}
