import type { Settings } from '../lib/types'

export const DEFAULT_SYSTEM_PROMPT = `You are a professional image captioning assistant. Your task is to objectively generate accurate, detailed, and descriptive image captions based on the provided image. Create 1 detailed image description in a long paragraph, including all details and concepts. Communicate efficiently; don't waffle or excessively speculate or conjecture about the meaning or overly praise. Just describe exactly what you see in the image. These descriptions should cover various aspects of the image, including characters, objects, actions, emotions, settings, and compositions. Accurately reflect the content of the image, use rich language to describe scenes and actions, remain objective, avoid subjective interpretations. If you recognize popular fictional characters or real-world concepts/people, then you should be sure to mention them in your descriptions. If the image contains text, be sure to add that to each description where possible. Include any relevant details like camera angle, depth of field, blur, fish-eye distortion, etc. Note: Only output the detailed description, do not include any summary or any other formatting.`

export const DEFAULT_SETTINGS: Settings = {
  threshold: 0.35, charThreshold: 0.85, inputSize: 448,
  triggerWord: '', triggerPosition: 'none', escapeParentheses: true,
  workerCount: 0, executionProvider: 'auto', modelName: 'wd-swinv2-tagger-v3', useMirror: false,
  modelSource: 'preset', localModelName: '',
  apiUrl: '', apiKey: '', apiModel: '', useSampling: false,
  temperature: 0.7, topP: 0.9, apiConcurrency: 8, maxRetries: 2,
  systemPrompt: DEFAULT_SYSTEM_PROMPT, roleName: '',
}

export function readSettings(): Settings {
  try {
    const current = localStorage.getItem('tagger-settings-v2')
    const saved = current ? JSON.parse(current) : {
      apiUrl: localStorage.getItem('nlTaggerApiUrl_v1_3_3') || '',
      apiKey: localStorage.getItem('nlTaggerApiKey_v1_3_3') || '',
      apiModel: localStorage.getItem('nlTaggerModelName_v1_3_3') || '',
    }
    const settings = { ...DEFAULT_SETTINGS }
    for (const key of Object.keys(settings) as (keyof Settings)[]) {
      if (typeof saved[key] === typeof settings[key]) Object.assign(settings, { [key]: saved[key] })
    }
    return settings
  } catch { return { ...DEFAULT_SETTINGS } }
}
