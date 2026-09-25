import { afterEach, expect, it, vi } from 'vitest'
import { retry } from './retry'
afterEach(() => vi.useRealTimers())
it('retries a transient failure with a fresh attempt and preserves the result', async () => {
  vi.useFakeTimers()
  const task = vi.fn().mockRejectedValueOnce(new Error('device lost')).mockResolvedValue('result')
  const pending = retry(task, 2, new AbortController().signal)
  await vi.runAllTimersAsync()
  expect(await pending).toBe('result')
  expect(task.mock.calls).toEqual([[0], [1]])
})
it('aborts backoff without dispatching another attempt', async () => {
  vi.useFakeTimers()
  const controller = new AbortController()
  const task = vi.fn().mockRejectedValue(new Error('temporary'))
  const pending = retry(task, 2, controller.signal)
  const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  await Promise.resolve(); controller.abort()
  await assertion
  expect(task).toHaveBeenCalledTimes(1)
})
