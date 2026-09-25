import { t } from '../i18n/translate'
import { create } from 'zustand'
import type { EngineId, JobProgress, RuntimeInfo, Settings, TagResult } from '../lib/types'
import { createThumbnail, captionImage, isImage } from '../core/images'
import { requestCaption, validateCaptionSettings } from '../core/caption/apiClient'
import { runQueue, throwIfAborted } from '../core/inference/queue'
import { modelDefinition } from '../core/models/registry'
import { loadModel, type DownloadProgress } from '../core/models/download'
import { parseTagsCSV } from '../core/tags/csv'
import { selectTags } from '../core/tags/format'
import { exportResults, resultText } from '../core/filesystem'
import { readSettings } from './settings'
import { cacheModel, getCachedModel, type CachedModel } from '../core/models/cache'
import { prepareWriteback, writeToFolders, type FolderImport, type DirectoryHandle, type WriteTarget } from '../core/folders'
export { DEFAULT_SYSTEM_PROMPT } from './settings'

interface Toast { id: number; message: string; tone: 'info' | 'ok' | 'warn' | 'err' }
interface AppState {
  engine: EngineId
  settings: Settings
  progress: JobProgress
  runtime: RuntimeInfo
  download: DownloadProgress | null
  importing: boolean
  writing: boolean
  writableCount: number
  results: TagResult[]
  toasts: Toast[]
  setEngine: (engine: EngineId) => void
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  importFiles: (files: File[], folder?: FolderImport) => Promise<void>
  importModel: (model: File, tags: File) => Promise<void>
  prepareWriteback: () => WriteTarget[]
  writeBack: (targets: WriteTarget[]) => Promise<void>
  run: (onlyPending?: boolean) => Promise<void>
  cancelRun: () => void
  clearAll: () => void
  exportZip: () => Promise<void>
  updateTags: (id: string, tags: TagResult['tags']) => void
  updateCaption: (id: string, caption: string) => void
  removeTag: (id: string, tagName: string) => void
  addTag: (id: string, tagName: string) => void
  pushToast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
}

const EMPTY_PROGRESS: JobProgress = { phase: 'idle', completed: 0, total: 0, inFlight: 0, failed: 0, startedAt: null, finishedAt: null }
// File handles stay outside reactive state; no original base64 strings are retained.
const sources = new Map<string, File>()
const folders = new Map<string, { directory: DirectoryHandle; root: DirectoryHandle }>()
let localModel: CachedModel | undefined
let active: AbortController | null = null
let importingController: AbortController | null = null
let toastSeq = 0
const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error)

export const useApp = create<AppState>((set, get) => {
  const patchResult = (id: string, patch: Partial<TagResult>) => set((s) => ({ results: s.results.map((r) => r.id === id ? { ...r, ...patch } : r) }))
  return {
    engine: 'caption', settings: readSettings(), progress: { ...EMPTY_PROGRESS },
    runtime: { backend: 'unknown', workers: 0, cores: navigator.hardwareConcurrency || 4 },
    download: null, importing: false, writing: false, writableCount: 0, results: [], toasts: [],
    setEngine: (engine) => { if (!active && !get().writing) set({ engine }) },
    setSetting: (key, value) => {
      const settings = { ...get().settings, [key]: value }
      set((state) => ({ settings, ...(['triggerWord', 'triggerPosition', 'escapeParentheses'].includes(key)
        ? { results: state.results.map((result) => result.outputEngine === 'booru' ? { ...result, saved: false } : result) } : {}) }))
      try { localStorage.setItem('tagger-settings-v2', JSON.stringify(settings)) }
      catch { get().pushToast(t("设置未能保存在此浏览器中"), 'warn') }
    },
    importModel: async (model, tags) => {
      if (active) return
      if (!model.size || !/\.onnx$/i.test(model.name)) throw new Error(t("请选择有效的 ONNX 模型"))
      const tagsText = await tags.text()
      parseTagsCSV(tagsText)
      const record = { name: `local:${model.name}`, modelBlob: model, tagsText, inputSize: get().settings.inputSize }
      localModel = record
      try { await cacheModel(record) } catch { get().pushToast(t("模型可继续使用，但缓存未能保存（可能存储空间不足）"), 'warn') }
      get().setSetting('localModelName', record.name)
      get().setSetting('modelSource', 'local')
      get().pushToast(t("本地模型已导入"), 'ok')
    },
    importFiles: async (files, folder) => {
      if (active || importingController || get().writing) return
      const images = files.filter(isImage)
      if (!images.length) { get().pushToast(t("没有找到支持的图片文件"), 'warn'); return }
      const controller = new AbortController()
      importingController = controller
      set({ importing: true, progress: { ...EMPTY_PROGRESS } })
      const entries = images.map((file) => {
        const id = crypto.randomUUID()
        sources.set(id, file)
        const directory = folder?.directories.get(file)
        if (directory && folder) folders.set(id, { directory, root: folder.root })
        return { id, name: file.name, relativePath: file.webkitRelativePath || file.name, thumbUrl: '', tags: [], status: 'queued' as const }
      })
      set((s) => ({ results: [...s.results, ...entries], writableCount: folders.size }))
      let failed = 0
      try {
        // Decoding is bounded independently of API concurrency to avoid a burst
        // of full-size decoded bitmaps before the user even starts processing.
        await runQueue(entries, 2, async (entry, i) => {
          try {
            const thumbnail = await createThumbnail(images[i], controller.signal)
            if (controller.signal.aborted) { URL.revokeObjectURL(thumbnail.thumbUrl); return }
            patchResult(entry.id, thumbnail)
          } catch (error) {
            throwIfAborted(controller.signal)
            failed++
            sources.delete(entry.id)
            patchResult(entry.id, { status: 'error', error: t("图片无法解码：{0}", { 0: messageOf(error) }) })
          }
        }, controller.signal)
        get().pushToast(t("已导入 {0} 张图片{1}", { 0: images.length - failed, 1: failed ? t("，{0} 张无法读取", { 0: failed }) : '' }), failed ? 'warn' : 'ok')
      } catch (error) {
        if (!controller.signal.aborted) get().pushToast(messageOf(error), 'err')
      } finally {
        if (importingController === controller) { importingController = null; set({ importing: false }) }
      }
    },
    run: async (onlyPending = true) => {
      if (active || importingController || get().writing) return
      const { engine, settings, results } = get()
      const jobs = results.filter((r) => sources.has(r.id) && (!onlyPending || r.status !== 'done' || r.outputEngine !== engine))
      if (!jobs.length) { get().pushToast(t("当前图片已全部完成"), 'info'); return }
      try {
        if (engine === 'caption') validateCaptionSettings(settings)
        else {
          if (settings.modelSource === 'preset') modelDefinition(settings.modelName, settings.useMirror)
          else if (!settings.localModelName) throw new Error(t("请先在设置中导入 ONNX 模型和 CSV 标签"))
          if (!Number.isSafeInteger(settings.workerCount) || settings.workerCount < 0) throw new Error(t("Worker 数量必须为非负整数"))
          if (!Number.isSafeInteger(settings.inputSize) || settings.inputSize < 1) throw new Error(t("输入尺寸必须为正整数"))
          if (!Number.isSafeInteger(settings.maxRetries) || settings.maxRetries < 0) throw new Error(t("重试次数必须为非负整数"))
        }
      } catch (error) { get().pushToast(messageOf(error), 'err'); return }
      const controller = new AbortController()
      active = controller
      const current = () => active === controller && !controller.signal.aborted
      const ids = new Set(jobs.map((r) => r.id))
      let failed = 0
      let pool: import('../core/inference/workerPool').TaggerPool | undefined
      set((s) => ({
        progress: { ...EMPTY_PROGRESS, phase: 'running', total: jobs.length, startedAt: performance.now() },
        results: s.results.map((r) => ids.has(r.id) ? { ...r, status: 'queued', error: undefined } : r),
      }))
      try {
        let definitions: ReturnType<typeof parseTagsCSV> = []
        let concurrency = settings.apiConcurrency
        if (engine === 'booru') {
          const record = settings.modelSource === 'local'
            ? (localModel?.name === settings.localModelName ? localModel : await getCachedModel(settings.localModelName))
            : await loadModel(modelDefinition(settings.modelName, settings.useMirror), controller.signal,
            (download) => { if (current()) set({ download }) },
            (message) => { if (current()) get().pushToast(message, 'warn') })
          if (!record) throw new Error(t("本地模型缓存不存在，请重新导入模型和标签"))
          throwIfAborted(controller.signal)
          definitions = parseTagsCSV(record.tagsText)
          const { TaggerPool } = await import('../core/inference/workerPool')
          throwIfAborted(controller.signal)
          // Probe the adapter without importing ONNX into the UI bundle.
          let gpu = false
          try { gpu = !!await (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu?.requestAdapter() } catch { /* WASM */ }
          throwIfAborted(controller.signal)
          concurrency = Math.min(jobs.length, settings.workerCount || (gpu && settings.executionProvider === 'auto' ? 2 : Math.max(1, Math.min(8, get().runtime.cores - 1))))
          pool = await TaggerPool.create(record.modelBlob, settings.inputSize, concurrency, controller.signal, (ready, total) => {
            if (current()) set({ download: { label: t("初始化推理会话 {0}/{1}", { 0: ready, 1: total }), loaded: ready, total } })
          }, settings.executionProvider === 'wasm')
          if (current()) set({ runtime: { ...get().runtime, backend: pool.backend, workers: pool.size }, download: null })
        }
        await runQueue(jobs, concurrency, async (job, _index, lane) => {
          if (!current()) return
          patchResult(job.id, { status: 'running' })
          try {
            const file = sources.get(job.id)!
            let output: Partial<TagResult>
            if (engine === 'caption') {
              // Data URL lives only for this in-flight request (and its retries).
              const dataURL = await captionImage(file, controller.signal)
              output = { caption: await requestCaption(dataURL, settings, controller.signal), tags: [] }
            } else {
              const scores = await pool!.infer(lane, file, controller.signal, settings.maxRetries)
              output = { tags: selectTags(scores, definitions, settings), caption: undefined }
              if (current() && get().runtime.backend !== pool!.backend) set({ runtime: { ...get().runtime, backend: pool!.backend } })
            }
            if (current()) patchResult(job.id, { ...output, outputEngine: engine, status: 'done', error: undefined, saved: false })
          } catch (error) {
            throwIfAborted(controller.signal)
            failed++
            if (current()) patchResult(job.id, { status: 'error', error: messageOf(error) })
          }
        }, controller.signal, (progress) => {
          if (current()) set((s) => ({ progress: { ...s.progress, ...progress, failed } }))
        })
        if (current()) {
          set((s) => ({ progress: { ...s.progress, phase: failed ? 'error' : 'done', finishedAt: performance.now() } }))
          get().pushToast(t("已完成 {0} 张{1}", { 0: jobs.length - failed, 1: failed ? t("，{0} 张失败，可重试", { 0: failed }) : '' }), failed ? 'warn' : 'ok')
        }
      } catch (error) {
        if (current()) {
          const message = messageOf(error)
          set((s) => ({ progress: { ...s.progress, phase: 'error', message, inFlight: 0, finishedAt: performance.now() }, download: null,
            results: s.results.map((r) => ids.has(r.id) && (r.status === 'queued' || r.status === 'running') ? { ...r, status: 'error', error: message } : r) }))
          get().pushToast(message, 'err')
        }
      } finally {
        pool?.dispose()
        if (active === controller) { active = null; set({ download: null }) }
      }
    },
    cancelRun: () => {
      active?.abort()
      active = null
      set((s) => ({ download: null,
        progress: { ...s.progress, phase: 'cancelled', inFlight: 0, finishedAt: performance.now() },
        results: s.results.map((r) => r.status === 'queued' || r.status === 'running' ? { ...r, status: 'cancelled' } : r),
      }))
    },
    clearAll: () => {
      if (get().writing) return
      active?.abort(); active = null
      importingController?.abort(); importingController = null
      for (const result of get().results) if (result.thumbUrl.startsWith('blob:')) URL.revokeObjectURL(result.thumbUrl)
      sources.clear()
      folders.clear()
      set({ results: [], progress: { ...EMPTY_PROGRESS }, download: null, importing: false, writableCount: 0 })
    },
    exportZip: async () => {
      const { results, engine, settings } = get()
      try { await exportResults(results, engine, settings); get().pushToast(t("ZIP 已生成"), 'ok') }
      catch (error) { get().pushToast(messageOf(error), 'err') }
    },
    prepareWriteback: () => prepareWriteback(get().results, get().engine, get().settings, folders),
    writeBack: async (targets) => {
      if (active || get().writing || importingController || !targets.length) return
      set({ writing: true })
      try {
        const { saved, failed } = await writeToFolders(targets, (id) => {
          const result = get().results.find((r) => r.id === id)
          const target = targets.find((t) => t.id === id)!
          // Editing may continue during I/O; never mark newer text as saved.
          if (result && resultText(result, get().engine, get().settings) === target.text) patchResult(id, { saved: true })
        })
        get().pushToast(t("已写入 {0} 个文件{1}", { 0: saved, 1: failed ? t("，{0} 个失败，可重试", { 0: failed }) : '' }), failed ? 'warn' : 'ok')
      } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) get().pushToast(messageOf(error), 'err') }
      finally { set({ writing: false }) }
    },
    updateTags: (id, tags) => patchResult(id, { tags, saved: false }),
    updateCaption: (id, caption) => patchResult(id, { caption, saved: false }),
    removeTag: (id, name) => {
      const result = get().results.find((r) => r.id === id)
      if (result) patchResult(id, { tags: result.tags.filter((t) => t.name !== name), saved: false })
    },
    addTag: (id, raw) => {
      const name = raw.trim()
      const result = get().results.find((r) => r.id === id)
      if (result && name && !result.tags.some((t) => t.name === name)) patchResult(id, { tags: [...result.tags, { name, score: 1, category: 0 }], saved: false })
    },
    pushToast: (message, tone = 'info') => {
      const id = ++toastSeq
      set((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, tone }] }))
      window.setTimeout(() => get().dismissToast(id), 5500)
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  }
})
