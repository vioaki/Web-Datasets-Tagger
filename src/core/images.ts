import { t } from '../i18n/translate'
import { abortError, throwIfAborted } from './inference/queue'

export const isImage = (file: File) => /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(file.name)

type RenderCanvas = OffscreenCanvas | HTMLCanvasElement

function makeCanvas(width: number, height: number): RenderCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function canvasBlob(canvas: RenderCanvas, type: string, quality: number): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) return canvas.convertToBlob({ type, quality })
  return new Promise((resolve, reject) => (canvas as HTMLCanvasElement).toBlob((blob: Blob | null) => blob ? resolve(blob) : reject(new Error(t("无法生成缩略图"))), type, quality))
}

function context2d(canvas: RenderCanvas): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const context = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!context || !('drawImage' in context)) throw new Error(t("浏览器不支持 2D 图片处理"))
  return context
}

/** Only the 512px preview gets an object URL; originals remain File references. */
export async function createThumbnail(file: Blob, signal?: AbortSignal) {
  throwIfAborted(signal)
  const bitmap = await createImageBitmap(file)
  try {
    throwIfAborted(signal)
    const ratio = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height))
    const canvas = makeCanvas(Math.max(1, Math.round(bitmap.width * ratio)), Math.max(1, Math.round(bitmap.height * ratio)))
    const ctx = context2d(canvas)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await canvasBlob(canvas, 'image/webp', 0.82)
    throwIfAborted(signal)
    return { thumbUrl: URL.createObjectURL(blob), w: bitmap.width, h: bitmap.height }
  } finally { bitmap.close() }
}

export function readDataURL(file: Blob, signal?: AbortSignal): Promise<string> {
  throwIfAborted(signal)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const abort = () => { reader.abort(); cleanup(); reject(signal?.reason ?? abortError()) }
    const cleanup = () => signal?.removeEventListener('abort', abort)
    reader.onload = () => { cleanup(); resolve(String(reader.result)) }
    reader.onerror = () => { cleanup(); reject(reader.error ?? new Error(t("图片读取失败"))) }
    signal?.addEventListener('abort', abort, { once: true })
    reader.readAsDataURL(file)
  })
}

export async function captionImage(file: File, signal: AbortSignal): Promise<string> {
  if (/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return readDataURL(file, signal)
  // Normalize formats that OpenAI-compatible vision endpoints don't accept.
  const bitmap = await createImageBitmap(file)
  try {
    throwIfAborted(signal)
    const canvas = makeCanvas(bitmap.width, bitmap.height)
    const ctx = context2d(canvas)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0)
    return await readDataURL(await canvasBlob(canvas, 'image/jpeg', 0.95), signal)
  } finally { bitmap.close() }
}
