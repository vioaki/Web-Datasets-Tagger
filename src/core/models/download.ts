import { t } from '../../i18n/translate'
import { throwIfAborted } from '../inference/queue'
import { retry } from '../inference/retry'
import { parseTagsCSV } from '../tags/csv'
import { cacheModel, getCachedModel, type CachedModel } from './cache'
import { readPartial, savePartial, removePartial, type PartialDownload } from './partials'
import type { ModelDefinition } from './registry'

export interface DownloadProgress { label: string; loaded: number; total: number | null }
class DownloadError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message) }
}

/** Resume only with a server validator. Servers without Range/CORS support safely restart. */
export async function downloadBlob(url: string, signal: AbortSignal, onProgress: (loaded: number, total: number | null) => void,
  options: { retries?: number; onWarning?: (message: string) => void } = {}): Promise<Blob> {
  let cacheAvailable = true
  const cacheWarning = () => {
    if (cacheAvailable) options.onWarning?.(t("断点缓存不可用，本次下载仍可继续"))
    cacheAvailable = false
  }
  return retry(async () => {
    let partial: PartialDownload | undefined
    if (cacheAvailable) try { partial = await readPartial(url) } catch { cacheWarning() }
    if (!partial?.validator || !(partial.blob instanceof Blob) || !partial.blob.size) partial = undefined
    throwIfAborted(signal)
    const headers: Record<string, string> = partial ? { Range: `bytes=${partial.blob.size}-`, 'If-Range': partial.validator } : {}
    const response = await fetch(url, { signal, headers })
    const discard = async () => { if (cacheAvailable) try { await removePartial(url) } catch { cacheWarning() } }
    if (!response.ok) {
      await response.body?.cancel()
      if (response.status === 416) await discard()
      throw new DownloadError(t("模型下载失败（HTTP {0}）", { 0: response.status }), [408, 416, 429].includes(response.status) || response.status >= 500)
    }
    const etag = response.headers.get('ETag')
    const validator = (etag && !etag.startsWith('W/') ? etag : response.headers.get('Last-Modified')) || ''
    const range = response.headers.get('Content-Range')?.match(/^bytes (\d+)-(\d+)\/(\d+)$/)
    const encoded = !!response.headers.get('Content-Encoding')
    if (response.status === 206 && (!partial || !range || +range[1] !== partial.blob.size || encoded ||
      (validator && validator !== partial.validator) || +range[2] < +range[1] || +range[2] >= +range[3])) {
      await response.body?.cancel()
      await discard()
      throw new DownloadError(t("服务器返回了无效的续传范围，正在重新下载"), true)
    }
    if (response.status !== 206) partial = undefined
    const length = Number(response.headers.get('Content-Length'))
    const total = response.status === 206 ? Number(range![3]) : length > 0 && !encoded ? length : null
    let loaded = partial?.blob.size ?? 0
    let base = partial?.blob ?? new Blob()
    let chunks: BlobPart[] = []
    let checkpoint = loaded
    let emitted = 0
    const checkpointSave = async () => {
      if (!cacheAvailable || encoded || !(validator || partial?.validator) || loaded === checkpoint) return
      base = new Blob([base, ...chunks]); chunks = []
      try { await savePartial({ url, blob: base, validator: validator || partial!.validator, total }); checkpoint = loaded }
      catch { cacheWarning() }
    }
    onProgress(loaded, total)
    if (!response.body) {
      const blob = new Blob([base, await response.blob()])
      throwIfAborted(signal)
      if (!blob.size || (total !== null && blob.size !== total)) throw new DownloadError(t("模型下载不完整，请重试"), true)
      await discard(); onProgress(blob.size, blob.size)
      return blob
    }
    const reader = response.body.getReader()
    const abort = () => { void reader.cancel().catch(() => undefined) }
    signal.addEventListener('abort', abort, { once: true })
    try {
      while (true) {
        throwIfAborted(signal)
        const { done, value } = await reader.read()
        throwIfAborted(signal)
        if (done) break
        chunks.push(value); loaded += value.byteLength
        if (performance.now() - emitted > 80) { onProgress(loaded, total); emitted = performance.now() }
        if (loaded - checkpoint >= 8 * 1024 * 1024) await checkpointSave()
      }
      if (!loaded || (total !== null && loaded !== total)) throw new DownloadError(t("模型下载不完整，请重试"), true)
      await discard()
      onProgress(loaded, total ?? loaded)
      return new Blob([base, ...chunks])
    } catch (error) {
      await checkpointSave()
      throw error
    } finally {
      signal.removeEventListener('abort', abort)
      await reader.cancel().catch(() => undefined)
      reader.releaseLock()
    }
  }, options.retries ?? 2, signal, (error) => !(error instanceof DownloadError) || error.retryable)
}

export async function loadModel(model: ModelDefinition, signal: AbortSignal, onProgress: (progress: DownloadProgress) => void, onWarning: (message: string) => void): Promise<CachedModel> {
  onProgress({ label: t("读取模型缓存"), loaded: 0, total: null })
  let cached: CachedModel | undefined
  try { cached = await getCachedModel(model.name) } catch { onWarning(t("无法读取本地缓存，本次将直接下载模型")) }
  throwIfAborted(signal)
  if (cached) {
    try {
      parseTagsCSV(cached.tagsText)
      onProgress({ label: t("已从本地缓存载入"), loaded: cached.modelBlob.size, total: cached.modelBlob.size })
      return cached
    } catch { onWarning(t("缓存标签损坏，正在重新下载")) }
  }
  const modelBlob = await downloadBlob(model.modelUrl, signal, (loaded, total) => onProgress({ label: t("下载模型"), loaded, total }), { onWarning })
  const tagsBlob = await downloadBlob(model.tagsUrl, signal, (loaded, total) => onProgress({ label: t("下载标签 CSV"), loaded, total }), { onWarning })
  const tagsText = await tagsBlob.text()
  parseTagsCSV(tagsText)
  throwIfAborted(signal)
  const record = { name: model.name, modelBlob, tagsText, inputSize: model.inputSize }
  onProgress({ label: t("保存模型缓存"), loaded: modelBlob.size, total: modelBlob.size })
  try { await cacheModel(record) } catch { onWarning(t("模型可继续使用，但缓存未能保存（可能存储空间不足）")) }
  throwIfAborted(signal)
  return record
}
