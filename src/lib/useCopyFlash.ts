import { useCallback, useEffect, useState } from 'react'

/**
 * Copies text and reports success briefly, so a card can show a checkmark
 * instead of firing a toast for every copy.
 */
export function useCopyFlash(ms = 1400): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), ms)
    return () => window.clearTimeout(t)
  }, [copied, ms])

  const copy = useCallback((text: string) => {
    // Clipboard API needs a secure context and can reject; fall back to a
    // hidden textarea so copying still works on http:// origins.
    const fallback = () => {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;top:-9999px;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      try {
        setCopied(document.execCommand('copy'))
      } catch {
        /* Nothing else to try. */
      }
      document.body.removeChild(ta)
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => setCopied(true), fallback)
    } else {
      fallback()
    }
  }, [])

  return [copied, copy]
}
