import { t } from '../../i18n/translate'
import type { Tag } from '../../lib/types'

export type TagDefinition = Pick<Tag, 'name' | 'category'>

/** RFC 4180 fields, including BOM, CRLF, embedded newlines and doubled quotes. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let closed = false
  const source = text.replace(/^\uFEFF/, '')
  const endField = () => { row.push(field); field = ''; closed = false }
  const endRow = () => { endField(); if (row.some((v) => v.trim())) rows.push(row); row = [] }
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') { quoted = false; closed = true }
      else field += c
    } else if (c === ',') endField()
    else if (c === '\r' || c === '\n') {
      endRow()
      if (c === '\r' && source[i + 1] === '\n') i++
    } else if (c === '"' && !field && !closed) quoted = true
    else if (closed && /\s/.test(c)) continue
    else if (closed || c === '"') throw new Error(t("CSV 引号格式错误"))
    else field += c
  }
  if (quoted) throw new Error(t("CSV 存在未闭合的引号"))
  endRow()
  return rows
}

export function parseTagsCSV(text: string): TagDefinition[] {
  const rows = parseCSV(text)
  if (!rows.length) throw new Error(t("标签 CSV 为空"))
  const header = rows[0].map((s) => s.trim().toLowerCase())
  let nameIndex = header.findIndex((s) => ['name', 'tag', 'tag_name'].includes(s))
  let categoryIndex = header.indexOf('category')
  const hasHeader = nameIndex >= 0
  if (!hasHeader) {
    if (header.includes('tag_id') || header.includes('category')) throw new Error(t("标签 CSV 缺少 name 列"))
    // Headerless: name; name,category; or id,name,category. Never discard row zero.
    nameIndex = rows[0].length >= 3 && /^\d+$/.test(rows[0][0]) ? 1 : 0
    categoryIndex = rows[0].length > nameIndex + 1 ? nameIndex + 1 : -1
  }
  const tags = rows.slice(hasHeader ? 1 : 0).map((row, index) => {
    const name = row[nameIndex]?.trim().replace(/_/g, ' ')
    const rawCategory = categoryIndex >= 0 ? row[categoryIndex]?.trim() : '0'
    const category = Number(rawCategory)
    // Reject malformed rows instead of shifting every subsequent ONNX output index.
    if (!name || rawCategory === undefined || rawCategory === '' || !Number.isInteger(category)) {
      throw new Error(t("标签 CSV 第 {0} 行缺少有效名称或分类", { 0: index + (hasHeader ? 2 : 1) }))
    }
    return { name, category }
  })
  if (!tags.length) throw new Error(t("标签 CSV 没有数据行"))
  return tags
}
