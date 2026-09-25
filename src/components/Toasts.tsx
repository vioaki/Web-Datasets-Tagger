import { t } from '../i18n/translate'
import { useState } from 'react'
import { IconCheck, IconX } from './Icons'

export interface ToastItem {
  id: number
  message: string
  tone: 'info' | 'ok' | 'warn' | 'err'
}

interface Props {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

export function Toasts({ toasts, onDismiss }: Props) {
  return (
    <div className="toasts" role="region" aria-label={t("通知")} aria-live="polite" aria-relevant="additions text">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [leaving, setLeaving] = useState(false)

  // Set the exit flag so the transition runs before unmount.
  function dismiss() {
    setLeaving(true)
    window.setTimeout(() => onDismiss(toast.id), 200)
  }

  return (
    <div className={`toast toast--${toast.tone}${leaving ? ' is-leaving' : ''}`}>
      <span className="toast__icon" aria-hidden="true">
        {toast.tone === 'ok' ? <IconCheck size={13} /> : <span className="toast__dot" />}
      </span>
      <span className="toast__text">{toast.message}</span>
      <button className="toast__x" onClick={dismiss} aria-label={t("关闭通知")}>
        <IconX size={12} />
      </button>
    </div>
  )
}
