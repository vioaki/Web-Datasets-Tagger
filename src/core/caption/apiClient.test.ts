import { describe, expect, it, vi } from 'vitest'
import { requestCaption, retryAfterMs } from './apiClient'
import type { Settings } from '../../lib/types'

const settings: Settings = {
  executionProvider: 'auto',
  threshold: .3, charThreshold: .8, inputSize: 448, triggerWord: '', triggerPosition: 'none', escapeParentheses: true,
  workerCount: 0, modelName: 'model', modelSource: 'preset', localModelName: '', useMirror: false, apiUrl: 'https://example.test/v1/chat/completions', apiKey: 'secret', apiModel: 'vision',
  useSampling: true, temperature: .7, topP: .9, apiConcurrency: 999, maxRetries: 1, systemPrompt: 'Describe {ROLE_NAME}', roleName: 'subject',
}

describe('caption API client', () => {
  it('uses the subject name with the default prompt and lets the provider choose its output limit', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'A subject.' } }] })))
    vi.stubGlobal('fetch', fetchMock)
    await requestCaption('data:image/png;base64,AA==', { ...settings, systemPrompt: 'Describe the image.' }, new AbortController().signal)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.messages[0].content).toContain('main subject as subject')
    expect(body).not.toHaveProperty('max_tokens')
    vi.unstubAllGlobals()
  })
  it('retries a transient response and parses OpenAI-compatible content', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: 'A quiet room.' } }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await requestCaption('data:image/png;base64,AA==', settings, new AbortController().signal)
    expect(result).toBe('A quiet room.')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).messages[0].content).toBe('Describe subject')
    vi.unstubAllGlobals()
  })

  it('honours Retry-After without exposing provider response bodies', async () => {
    expect(retryAfterMs('2')).toBe(2000)
    const fetchMock = vi.fn().mockResolvedValue(new Response('secret provider body', { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(requestCaption('data:image/png;base64,AA==', settings, new AbortController().signal)).rejects.toThrow('HTTP 401')
    await expect(requestCaption('data:image/png;base64,AA==', { ...settings, apiKey: '' }, new AbortController().signal)).rejects.not.toThrow('secret provider body')
    vi.unstubAllGlobals()
  })
})
