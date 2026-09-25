import { t } from '../i18n/translate'
import { strToU8, zip } from 'fflate'
import type { EngineId, Settings, TagResult } from '../lib/types'
import { formatTags } from './tags/format'

export function resultText(result: TagResult, engine: EngineId, settings: Settings): string {
  return engine === 'caption' ? result.caption ?? '' : formatTags(result.tags, settings)
}

export async function createExportArchive(results: TagResult[], engine: EngineId, settings: Settings): Promise<Uint8Array<ArrayBuffer>> {
  const files: Record<string, Uint8Array> = Object.create(null)
  for (const result of results) {
    if (result.outputEngine !== engine || result.status !== 'done') continue
    const path = (result.relativePath || result.name).replace(/\\/g, '/').split('/').filter((s) => s && s !== '.' && s !== '..').join('/')
    const stem = path.replace(/\.[^/.]+$/, '') || 'image'
    let name = `${stem}.txt`
    for (let i = 2; Object.hasOwn(files, name); i++) name = `${stem} (${i}).txt`
    files[name] = strToU8(resultText(result, engine, settings))
  }
  if (!Object.keys(files).length) throw new Error(t("当前模式还没有可导出的结果"))
  return new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => zip(files, { level: 0 }, (error, data) => error ? reject(error) : resolve(data as Uint8Array<ArrayBuffer>)))
}

export async function exportResults(results: TagResult[], engine: EngineId, settings: Settings): Promise<void> {
  const bytes = await createExportArchive(results, engine, settings)
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `tagger-${engine}-${new Date().toISOString().slice(0, 10)}.zip`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
