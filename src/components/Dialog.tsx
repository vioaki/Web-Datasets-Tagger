import { t } from '../i18n/translate'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconX } from './Icons'

/** Native modal supplies focus containment and makes the page behind it inert. */
export function Dialog({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      previous?.focus({ preventScroll: true })
    }
  }, [open])
  return (
    <dialog ref={ref} className="sheet sheet--narrow" aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], summary, input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]'))
          .filter((element) => element.getClientRects().length > 0)
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const box = event.currentTarget.getBoundingClientRect()
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose()
      }}>
      <div className="sheet__head">
        <h2 id={titleId} className="sheet__title">{title}</h2>
        <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label={t("关闭")} title={t("关闭")} autoFocus><IconX size={18} /></button>
      </div>
      <div className="sheet__body">{children}</div>
    </dialog>
  )
}
