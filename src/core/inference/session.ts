import * as ort from 'onnxruntime-web/webgpu'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url'
import mjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url'

export type Backend = 'webgpu' | 'wasm'

export async function detectBackend(): Promise<Backend> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
    return gpu && await gpu.requestAdapter() ? 'webgpu' : 'wasm'
  } catch { return 'wasm' }
}

export async function createSession(buffer: ArrayBuffer, forceWasm = false): Promise<{ session: ort.InferenceSession; backend: Backend }> {
  // GitHub Pages is not cross-origin isolated. Parallelism comes from independent
  // workers, never SharedArrayBuffer or ORT's intra-session thread pool.
  ort.env.wasm.numThreads = 1
  ort.env.wasm.proxy = false
  ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: mjsUrl }
  if (!forceWasm && await detectBackend() === 'webgpu') {
    try {
      return { session: await ort.InferenceSession.create(buffer, { executionProviders: ['webgpu', 'wasm'] }), backend: 'webgpu' }
    } catch { /* Adapter presence doesn't guarantee model/operator support. */ }
  }
  return { session: await ort.InferenceSession.create(buffer, { executionProviders: ['wasm'] }), backend: 'wasm' }
}
