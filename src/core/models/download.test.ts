import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadBlob, loadModel } from './download'
import { readPartial, savePartial } from './partials'
import { cacheModel, getCachedModel } from './cache'

const signal = () => new AbortController().signal
const progress = vi.fn()
afterEach(() => vi.unstubAllGlobals())

describe('resumable model downloads', () => {
  it('resumes an interrupted stream at the saved byte offset', async () => {
    const url = 'https://example.test/interrupted'
    let reads = 0
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({
      pull(c) { if (reads++ === 0) c.enqueue(new TextEncoder().encode('abc')); else c.error(new TypeError('network lost')) },
    }), { headers: { ETag: '"v1"', 'Content-Length': '6' } })))
    await expect(downloadBlob(url, signal(), progress, { retries: 0 })).rejects.toThrow('network lost')
    expect(await (await readPartial(url))?.blob.text()).toBe('abc')
    const fetchMock = vi.fn().mockResolvedValue(new Response('def', { status: 206, headers: { ETag: '"v1"', 'Content-Range': 'bytes 3-5/6' } }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await (await downloadBlob(url, signal(), progress)).text()).toBe('abcdef')
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Range: 'bytes=3-', 'If-Range': '"v1"' })
    expect(await readPartial(url)).toBeUndefined()
  })
  it('restarts safely when the server ignores Range or changes the model', async () => {
    const url = 'https://example.test/replaced'
    await savePartial({ url, blob: new Blob(['old']), validator: '"old"', total: 6 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('new model', { headers: { ETag: '"new"', 'Content-Length': '9' } })))
    expect(await (await downloadBlob(url, signal(), progress)).text()).toBe('new model')
  })
  it('rejects a mismatched range without combining incompatible bytes', async () => {
    const url = 'https://example.test/bad-range'
    await savePartial({ url, blob: new Blob(['abc']), validator: '"v1"', total: 6 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('def', { status: 206, headers: { ETag: '"v2"', 'Content-Range': 'bytes 3-5/6' } })))
    await expect(downloadBlob(url, signal(), progress, { retries: 0 })).rejects.toThrow('续传范围')
    expect(await readPartial(url)).toBeUndefined()
  })
  it('cancels a stalled response and retains received bytes', async () => {
    const url = 'https://example.test/cancel'
    const controller = new AbortController()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({
      start(c) { c.enqueue(new TextEncoder().encode('abc')) },
    }), { headers: { ETag: '"v1"', 'Content-Length': '9' } })))
    await expect(downloadBlob(url, controller.signal, (loaded) => { if (loaded) controller.abort() }, { retries: 0 })).rejects.toMatchObject({ name: 'AbortError' })
    expect(await (await readPartial(url))?.blob.text()).toBe('abc')
  })
  it('does not retry an authorization failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(downloadBlob('https://example.test/forbidden', signal(), progress)).rejects.toThrow('403')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('reuses the legacy IndexedDB model record without a network call', async () => {
    const record = { name: 'cached-model', modelBlob: new Blob(['model']), tagsText: 'name,category\nblue,0', inputSize: 448 }
    await cacheModel(record)
    expect((await getCachedModel(record.name))?.modelBlob.size).toBe(5)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const model = await loadModel({ ...record, modelUrl: 'https://example.test/model', tagsUrl: 'https://example.test/tags' }, signal(), progress, vi.fn())
    expect(model.tagsText).toBe(record.tagsText)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
