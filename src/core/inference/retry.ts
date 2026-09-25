import { delay, throwIfAborted } from './queue'

export async function retry<T>(task: (attempt: number) => Promise<T>, retries: number, signal: AbortSignal,
  retryable: (error: unknown) => boolean = () => true): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    throwIfAborted(signal)
    try { return await task(attempt) }
    catch (error) {
      throwIfAborted(signal)
      if (attempt >= retries || !retryable(error)) throw error
      await delay(Math.min(30_000, 500 * 2 ** attempt), signal)
    }
  }
}
