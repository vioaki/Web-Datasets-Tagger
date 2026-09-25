/** Tag category ids as used by the WD tagger `selected_tags.csv`. */
export const TAG_CATEGORY = {
  GENERAL: 0,
  ARTIST: 1,
  COPYRIGHT: 3,
  CHARACTER: 4,
  META: 5,
} as const

export type TagCategory = number

export interface Tag {
  name: string
  score: number
  category: TagCategory
}

/**
 * One processed image. `caption` is the primary artifact — most work now
 * goes through a remote VLM; `tags` only fills in for the local tagger.
 */
export interface TagResult {
  id: string
  name: string
  relativePath?: string
  status?: 'queued' | 'running' | 'done' | 'error' | 'cancelled'
  outputEngine?: EngineId
  /** Small preview for the grid — never the full-resolution original. */
  thumbUrl: string
  tags: Tag[]
  caption?: string
  /** Set when this image failed to process. */
  error?: string
  saved?: boolean
  /** Dimensions, for the index/metadata line. */
  w?: number
  h?: number
}

export type EngineId = 'caption' | 'booru'

export type JobPhase = 'idle' | 'running' | 'done' | 'error' | 'cancelled'

export interface JobProgress {
  phase: JobPhase
  completed: number
  total: number
  /** Requests currently in flight. */
  inFlight: number
  failed: number
  message?: string
  startedAt: number | null
  finishedAt: number | null
}

export interface RuntimeInfo {
  backend: 'webgpu' | 'wasm' | 'mixed' | 'unknown'
  workers: number
  cores: number
}

export interface Settings {
  threshold: number
  charThreshold: number
  inputSize: number
  triggerWord: string
  triggerPosition: 'none' | 'prefix' | 'suffix' | 'prefix_nocomma' | 'suffix_nocomma'
  escapeParentheses: boolean
  /** 0 selects a backend-sensitive default; positive values are explicit. */
  workerCount: number
  executionProvider: 'auto' | 'wasm'
  modelName: string
  modelSource: 'preset' | 'local'
  localModelName: string
  useMirror: boolean
  apiUrl: string
  apiKey: string
  apiModel: string
  useSampling: boolean
  temperature: number
  topP: number
  /** Positive integer; no application-imposed upper limit. */
  apiConcurrency: number
  maxRetries: number
  systemPrompt: string
  roleName: string
}
