import { setTranslationLocale, t } from '../../i18n/translate'
import * as ort from 'onnxruntime-web/webgpu'
import { createSession } from './session'
import type { WorkerRequest, WorkerResponse } from './protocol'

const scope = self as unknown as { onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null; postMessage(message: WorkerResponse, transfer?: Transferable[]): void }
let session: ort.InferenceSession | null = null
let inputSize = 448

scope.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      setTranslationLocale(data.locale ?? 'zh-CN')
      await session?.release()
      const ready = await createSession(data.model, data.forceWasm)
      session = ready.session
      inputSize = data.inputSize
      const meta = session.inputMetadata[0]
      if (session.inputNames.length !== 1 || !meta?.isTensor || meta.type !== 'float32') throw new Error(t("仅支持单输入 float32 WD tagger 模型"))
      const expected = [1, inputSize, inputSize, 3]
      if (meta.shape.length !== 4 || meta.shape.some((d, i) => typeof d === 'number' && d > 0 && d !== expected[i])) {
        throw new Error(t("模型需要输入 {0}，请检查输入尺寸与 NHWC 布局", { 0: meta.shape.join(' × ') }))
      }
      scope.postMessage({ type: 'ready', id: data.id, backend: ready.backend })
      return
    }
    if (!session) throw new Error(t("模型尚未就绪"))
    const bitmap = await createImageBitmap(new Blob([data.image]))
    let tensor: ort.Tensor | undefined
    let outputs: ort.InferenceSession.OnnxValueMapType | undefined
    try {
      const canvas = new OffscreenCanvas(inputSize, inputSize)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error(t("浏览器不支持 OffscreenCanvas"))
      const ratio = inputSize / Math.max(bitmap.width, bitmap.height)
      const width = Math.max(1, Math.round(bitmap.width * ratio))
      const height = Math.max(1, Math.round(bitmap.height * ratio))
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, inputSize, inputSize)
      ctx.drawImage(bitmap, (inputSize - width) / 2, (inputSize - height) / 2, width, height)
      const rgba = ctx.getImageData(0, 0, inputSize, inputSize).data
      const pixels = new Float32Array(inputSize * inputSize * 3)
      for (let i = 0, j = 0; i < rgba.length; i += 4) {
        pixels[j++] = rgba[i + 2]; pixels[j++] = rgba[i + 1]; pixels[j++] = rgba[i]
      }
      tensor = new ort.Tensor('float32', pixels, [1, inputSize, inputSize, 3])
      outputs = await session.run({ [session.inputNames[0]]: tensor })
      const output = outputs[session.outputNames[0]]
      if (output.type !== 'float32') throw new Error(t("模型输出必须为 float32 分数"))
      // Copy out of ORT-owned memory before disposing the output tensors.
      const scores = new Float32Array(await output.getData() as Float32Array)
      scope.postMessage({ type: 'result', id: data.id, scores: scores.buffer }, [scores.buffer])
    } finally {
      bitmap.close()
      tensor?.dispose()
      if (outputs) for (const output of Object.values(outputs)) output.dispose()
    }
  } catch (error) {
    scope.postMessage({ type: 'error', id: data.id, message: error instanceof Error ? error.message : String(error) })
  }
}
