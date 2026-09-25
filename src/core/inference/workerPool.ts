import { getTranslationLocale, t } from '../../i18n/translate'
import { abortError, throwIfAborted } from './queue'
import type { WorkerRequest, WorkerResponse } from './protocol'
import type { Backend } from './session'
import { retry } from './retry'

class WorkerClient {
  private worker = new Worker(new URL('./tagger.worker.ts', import.meta.url), { type: 'module' })
  private sequence = 0
  private pending = new Map<number, { resolve: (message: WorkerResponse) => void; reject: (error: Error) => void }>()
  private stopped = false

  constructor() {
    this.worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      const request = this.pending.get(data.id)
      if (!request) return
      this.pending.delete(data.id)
      if (data.type === 'error') request.reject(new Error(data.message))
      else request.resolve(data)
    }
    this.worker.onerror = (event) => { event.preventDefault(); this.dispose(new Error(event.message || t("推理 Worker 已退出"))) }
    this.worker.onmessageerror = () => this.dispose(new Error(t("推理 Worker 消息无法解码")))
  }

  request(message: Omit<Extract<WorkerRequest, { type: 'init' }>, 'id'> | Omit<Extract<WorkerRequest, { type: 'infer' }>, 'id'>, transfer: Transferable[]): Promise<WorkerResponse> {
    if (this.stopped) return Promise.reject(abortError())
    return new Promise((resolve, reject) => {
      const id = ++this.sequence
      this.pending.set(id, { resolve, reject })
      try { this.worker.postMessage({ ...message, id }, transfer) }
      catch (error) { this.pending.delete(id); reject(error) }
    })
  }

  dispose(error: Error = abortError()): void {
    this.stopped = true
    this.worker.terminate()
    for (const request of this.pending.values()) request.reject(error)
    this.pending.clear()
  }
}

export class TaggerPool {
  private clients: WorkerClient[] = []
  private backends: Backend[] = []
  private detach = () => {}
  private constructor(private model: Blob, private inputSize: number) {}
  get backend(): Backend | 'mixed' { return new Set(this.backends).size > 1 ? 'mixed' : this.backends[0] ?? 'wasm' }
  get size() { return this.clients.length }

  static async create(model: Blob, inputSize: number, count: number, signal: AbortSignal, onReady?: (ready: number, total: number) => void, forceWasm = false): Promise<TaggerPool> {
    if (!Number.isSafeInteger(count) || count < 1) throw new Error(t("Worker 数量必须为正整数"))
    const pool = new TaggerPool(model, inputSize)
    const abort = () => pool.dispose()
    signal.addEventListener('abort', abort, { once: true })
    pool.detach = () => signal.removeEventListener('abort', abort)
    try {
      for (let i = 0; i < count; i++) {
        throwIfAborted(signal)
        // Blob is immutable and cheap to retain; allocate only one transferable
        // model buffer at a time. A detached buffer cannot be reused by a peer.
        const buffer = await model.arrayBuffer()
        throwIfAborted(signal)
        const client = new WorkerClient()
        pool.clients.push(client)
        const response = await client.request({ type: 'init', model: buffer, inputSize, forceWasm, locale: getTranslationLocale() }, [buffer])
        throwIfAborted(signal)
        if (response.type !== 'ready') throw new Error(t("Worker 初始化响应无效"))
        pool.backends[i] = response.backend
        onReady?.(i + 1, count)
      }
      return pool
    } catch (error) { pool.dispose(); throw error }
  }

  /** A queue lane exclusively owns this worker until its task settles. */
  async infer(lane: number, file: File, signal: AbortSignal, retries = 2): Promise<Float32Array> {
    return retry(async (attempt) => {
      if (attempt) {
        this.clients[lane].dispose()
        const model = await this.model.arrayBuffer()
        throwIfAborted(signal)
        const client = new WorkerClient()
        this.clients[lane] = client
        // GPU loss/operator failures get a fresh WASM session on the retry.
        const ready = await client.request({ type: 'init', model, inputSize: this.inputSize, forceWasm: true, locale: getTranslationLocale() }, [model])
        if (ready.type !== 'ready') throw new Error(t("Worker 初始化响应无效"))
        this.backends[lane] = ready.backend
      }
      throwIfAborted(signal)
      const buffer = await file.arrayBuffer()
      throwIfAborted(signal)
      const result = await this.clients[lane].request({ type: 'infer', image: buffer }, [buffer])
      throwIfAborted(signal)
      if (result.type !== 'result') throw new Error(t("Worker 推理响应无效"))
      return new Float32Array(result.scores)
    }, retries, signal)
  }

  dispose(): void {
    this.detach()
    this.clients.forEach((client) => client.dispose())
    this.clients = []
  }
}
