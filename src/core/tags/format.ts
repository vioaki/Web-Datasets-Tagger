import { t } from '../../i18n/translate'
import type { Settings, Tag } from '../../lib/types'
import type { TagDefinition } from './csv'

export function selectTags(scores: Float32Array, definitions: TagDefinition[], settings: Settings): Tag[] {
  if (scores.length !== definitions.length) throw new Error(t("模型输出 {0} 项，与 CSV 的 {1} 个标签不匹配", { 0: scores.length, 1: definitions.length }))
  return definitions.flatMap((tag, i) => scores[i] >= (tag.category === 4 ? settings.charThreshold : settings.threshold)
    ? [{ ...tag, score: scores[i] }] : []).sort((a, b) => b.score - a.score)
}

export function formatTags(tags: Tag[], settings: Pick<Settings, 'escapeParentheses' | 'triggerWord' | 'triggerPosition'>): string {
  const text = tags.map(({ name }) => settings.escapeParentheses ? name.replace(/[()]/g, '\\$&') : name).join(', ')
  const trigger = settings.triggerWord.trim()
  if (!trigger || settings.triggerPosition === 'none') return text
  const sep = text ? (settings.triggerPosition.endsWith('_nocomma') ? ' ' : ', ') : ''
  return settings.triggerPosition.startsWith('prefix') ? trigger + sep + text : text + sep + trigger
}
