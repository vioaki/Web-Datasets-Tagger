import type { Backend } from './session'

export type WorkerRequest =
  | { type: 'init'; id: number; model: ArrayBuffer; inputSize: number; forceWasm?: boolean; locale?: string }
  | { type: 'infer'; id: number; image: ArrayBuffer }

export type WorkerResponse =
  | { type: 'ready'; id: number; backend: Backend }
  | { type: 'result'; id: number; scores: ArrayBuffer }
  | { type: 'error'; id: number; message: string }
