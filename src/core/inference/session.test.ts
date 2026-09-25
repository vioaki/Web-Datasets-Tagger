import { afterEach, expect, it, vi } from 'vitest'
import * as ort from 'onnxruntime-web/webgpu'
import { createSession } from './session'
vi.mock('onnxruntime-web/webgpu', () => ({ env: { wasm: {} }, InferenceSession: { create: vi.fn() } }))
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals() })
it('falls back to WASM when a WebGPU model session fails', async () => {
  vi.stubGlobal('navigator', { gpu: { requestAdapter: async () => ({}) } })
  const create = vi.mocked(ort.InferenceSession.create)
  const session = { release: vi.fn() }
  create.mockRejectedValueOnce(new Error('unsupported operator')).mockResolvedValueOnce(session as unknown as ort.InferenceSession)
  expect((await createSession(new ArrayBuffer(1))).backend).toBe('wasm')
  expect(create.mock.calls.map(call => call[1])).toEqual([{ executionProviders: ['webgpu', 'wasm'] }, { executionProviders: ['wasm'] }])
  expect(ort.env.wasm.numThreads).toBe(1)
})
it('does not require WebGPU or SharedArrayBuffer for WASM', async () => {
  vi.stubGlobal('navigator', {})
  vi.mocked(ort.InferenceSession.create).mockResolvedValue({} as ort.InferenceSession)
  expect((await createSession(new ArrayBuffer(1))).backend).toBe('wasm')
  expect(ort.env.wasm.numThreads).toBe(1)
})
