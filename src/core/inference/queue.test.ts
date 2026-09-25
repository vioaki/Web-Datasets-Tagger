import { describe, expect, it } from 'vitest'
import { runQueue } from './queue'

describe('abortable worker queue', () => {
  it('honours requested concurrency above 64 without an application ceiling', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    let started = 0
    const pending = runQueue(Array.from({ length: 200 }, (_, i) => i), 128, async () => {
      started++; await gate
    }, new AbortController().signal)
    expect(started).toBe(128)
    release(); await pending
    expect(started).toBe(200)
  })
  it('pulls work into the requested number of lanes', async () => {
    const controller = new AbortController()
    let active = 0
    let peak = 0
    const seen: number[] = []
    await runQueue([1, 2, 3, 4, 5], 3, async (item) => {
      active++; peak = Math.max(peak, active); await new Promise((r) => setTimeout(r, 2)); seen.push(item); active--
    }, controller.signal)
    expect(peak).toBe(3)
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('stops pending work when aborted', async () => {
    const controller = new AbortController()
    let started = 0
    const promise = runQueue(Array.from({ length: 20 }, (_, i) => i), 2, async () => {
      started++; await new Promise((r) => setTimeout(r, 10))
    }, controller.signal)
    setTimeout(() => controller.abort(), 3)
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    expect(started).toBeLessThan(20)
  })
})
