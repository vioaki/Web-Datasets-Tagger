import { t } from '../../i18n/translate'
export function abortError(): DOMException {
  return new DOMException(t("已取消"), 'AbortError')
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? abortError()
}

export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal)
  return new Promise((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener('abort', abort)
    const timer = setTimeout(() => { cleanup(); resolve() }, ms)
    const abort = () => { clearTimeout(timer); cleanup(); reject(signal?.reason ?? abortError()) }
    signal?.addEventListener('abort', abort, { once: true })
  })
}

export interface QueueProgress { completed: number; inFlight: number; total: number }

/** Pull the next task only when a lane is free. No artificial concurrency ceiling. */
export async function runQueue<T>(
  items: readonly T[],
  concurrency: number,
  task: (item: T, index: number, lane: number) => Promise<void>,
  signal: AbortSignal,
  onProgress?: (progress: QueueProgress) => void,
): Promise<void> {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) throw new Error(t("并发数必须为正整数"))
  throwIfAborted(signal)
  let next = 0
  let completed = 0
  let inFlight = 0
  let failure: unknown
  let failed = false
  const emit = () => onProgress?.({ completed, inFlight, total: items.length })
  const lanes = Array.from({ length: Math.min(concurrency, items.length) }, async (_, lane) => {
    while (next < items.length && !signal.aborted && !failed) {
      const index = next++
      inFlight++
      emit()
      try {
        await task(items[index], index, lane)
        throwIfAborted(signal)
        completed++
      } catch (error) {
        if (!failed) { failed = true; failure = error }
      } finally {
        inFlight--
        emit()
      }
    }
  })
  await Promise.all(lanes)
  throwIfAborted(signal)
  if (failed) throw failure
}
