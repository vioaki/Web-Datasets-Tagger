import { t } from '../../i18n/translate'
import type { Settings } from '../../lib/types'
import { delay, throwIfAborted } from '../inference/queue'

class ApiError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly retryAfter = 0) { super(message) }
}

export function validateCaptionSettings(settings: Settings): void {
  let url: URL
  try { url = new URL(settings.apiUrl.trim()) } catch { throw new Error(t("请在设置中填写完整的 API URL")) }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(t("API URL 必须以 http:// 或 https:// 开头"))
  if (!settings.apiModel.trim()) throw new Error(t("请在设置中填写模型名称"))
  if (!Number.isSafeInteger(settings.apiConcurrency) || settings.apiConcurrency < 1) throw new Error(t("并发请求数必须为正整数"))
  if (!Number.isSafeInteger(settings.maxRetries) || settings.maxRetries < 0) throw new Error(t("重试次数必须为非负整数"))
}

export function retryAfterMs(value: string | null): number {
  if (!value) return 0
  const seconds = Number(value)
  return Math.max(0, Number.isFinite(seconds) ? seconds * 1000 : (Date.parse(value) - Date.now()) || 0)
}

/** OpenAI-compatible chat/completions. Caller owns the abortable batch queue. */
export async function requestCaption(imageURL: string, settings: Settings, signal: AbortSignal): Promise<string> {
  validateCaptionSettings(settings)
  const role = settings.roleName.trim()
  const prompt = settings.systemPrompt.replaceAll('{ROLE_NAME}', role) +
    (role && !settings.systemPrompt.includes('{ROLE_NAME}') ? `\nRefer to the main subject as ${role}.` : '')
  const body = JSON.stringify({
    model: settings.apiModel.trim(),
    messages: [
      ...(prompt ? [{ role: 'system', content: prompt }] : []),
      { role: 'user', content: [{ type: 'text', text: 'Describe this image.' }, { type: 'image_url', image_url: { url: imageURL } }] },
    ],
    ...(settings.useSampling ? { temperature: settings.temperature, top_p: settings.topP } : {}),
    stream: false,
  })
  for (let attempt = 0; ; attempt++) {
    throwIfAborted(signal)
    try {
      const response = await fetch(settings.apiUrl.trim(), {
        method: 'POST', signal, redirect: 'error',
        headers: { 'Content-Type': 'application/json', ...(settings.apiKey.trim() ? { Authorization: `Bearer ${settings.apiKey.trim()}` } : {}) },
        body,
      })
      if (!response.ok) {
        const retryable = [408, 409, 425, 429].includes(response.status) || response.status >= 500
        // Do not reflect arbitrary provider bodies (which may echo keys/images) into UI.
        await response.body?.cancel()
        throw new ApiError(t("API 请求失败（HTTP {0}）{1}", { 0: response.status, 1: response.status === 429 ? t("：端点限流，请调整并发或重试") : response.status === 401 || response.status === 403 ? t("：请检查 API Key 与访问权限") : '' }), retryable, retryAfterMs(response.headers.get('Retry-After')))
      }
      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content
      const text = typeof content === 'string' ? content : Array.isArray(content)
        ? content.filter((part) => part?.type === 'text' && typeof part.text === 'string').map((part) => part.text).join('\n') : ''
      if (!text.trim()) throw new ApiError(t("API 没有返回有效描述，请检查模型是否支持图片"), true)
      return text.trim()
    } catch (error) {
      throwIfAborted(signal)
      if (attempt >= settings.maxRetries || (error instanceof ApiError && !error.retryable)) {
        if (error instanceof TypeError) throw new Error(t("无法连接 API，请检查网络、端点地址与 CORS 配置"))
        throw error
      }
      const backoff = Math.min(30_000, 1000 * 2 ** attempt) + Math.random() * 250
      await delay(Math.max(backoff, error instanceof ApiError ? error.retryAfter : 0), signal)
    }
  }
}
