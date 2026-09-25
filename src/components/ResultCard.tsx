import { t } from '../i18n/translate'
import { useLayoutEffect, useRef, useState } from 'react'
import { useCopyFlash } from '../lib/useCopyFlash'
import type { Settings, TagResult } from '../lib/types'
import { resultText } from '../core/filesystem'
import { IconCheck, IconCopy, IconPlus, IconTrash, IconX } from './Icons'

interface Props {
  result: TagResult
  index: number
  engine: 'caption' | 'booru'
  settings: Settings
  onRemoveTag: (name: string) => void
  onAddTag: (name: string) => void
  onClearTags: () => void
  onCaptionChange: (caption: string) => void
}

/**
 * A single plate in the gallery. The image is unadorned — no border, no
 * chrome — with its caption set in the serif beneath it, the way a printed
 * plate is titled. Metadata sits in small caps to one side.
 */
export function ResultCard({
  result,
  index,
  engine,
  settings,
  onRemoveTag,
  onAddTag,
  onClearTags,
  onCaptionChange,
}: Props) {
  const [copied, copy] = useCopyFlash()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(result.caption ?? '')
  const [adding, setAdding] = useState(false)
  const [newTag, setNewTag] = useState('')
  const editButton = useRef<HTMLButtonElement>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const restoreEditFocus = useRef(false)
  const restoreAddFocus = useRef(false)

  useLayoutEffect(() => {
    if (!editing && restoreEditFocus.current) { editButton.current?.focus({ preventScroll: true }); restoreEditFocus.current = false }
    if (!adding && restoreAddFocus.current) { addButton.current?.focus({ preventScroll: true }); restoreAddFocus.current = false }
  }, [editing, adding])

  const text = resultText(result, engine, settings)
  const ready = result.status === 'done' && result.outputEngine === engine
  const plate = String(index + 1).padStart(2, '0')

  function commitCaption() {
    restoreEditFocus.current = true
    setEditing(false)
    if (draft !== result.caption) onCaptionChange(draft)
  }

  function commitTag(e: React.FormEvent) {
    e.preventDefault()
    const name = newTag.trim()
    if (name) onAddTag(name)
    setNewTag('')
    restoreAddFocus.current = true
    setAdding(false)
  }

  return (
    <article className="plate">
      <div className="plate__frame">
        {result.thumbUrl ? <img
          className="plate__img"
          src={result.thumbUrl}
          alt={result.caption ?? result.name}
          loading="lazy"
          decoding="async"
          width={result.w}
          height={result.h}
        /> : <div className="plate__placeholder">{result.error ? t("无法预览") : t("正在整理…")}</div>}

        <div className="plate__actions">
          <button
            className="iconbtn"
            onClick={() => copy(text)}
            aria-label={copied ? t("已复制") : t("复制")}
            title={copied ? t("已复制") : t("复制")}
            disabled={!ready}
          >
            {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
          </button>
          {engine === 'booru' && ready && (
            <button
              className="iconbtn"
              onClick={onClearTags}
              aria-label={t("清空标签")}
              title={t("清空标签")}
            >
              <IconTrash size={13} />
            </button>
          )}
        </div>

        {result.saved && (
          <span className="plate__saved" title={t("已写入 .txt")}>
            <IconCheck size={10} />
          </span>
        )}
      </div>

      <div className="plate__meta"><span title={result.relativePath || result.name}>{result.name}</span>{result.w && <span className="tnum">{result.w} × {result.h}</span>}</div>
      {result.error && <p className="plate__error" role="status">{result.error}</p>}

      <div className="plate__caption">
        <span className="plate__no tnum">{plate}</span>

        {!ready ? <p className="plate__empty">{result.status === 'running' ? t("正在处理…") : result.status === 'cancelled' ? t("已暂停，可继续处理") : result.error ? t("等待重试") : t("等待生成")}</p> : engine === 'caption' ? (
          editing ? (
            <div className="plate__editing">
            <textarea
              className="plate__editor"
              value={draft}
              autoFocus
              rows={5}
              aria-label={t("编辑 {0} 的描述", { 0: result.name })}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return
                if (e.key === 'Escape') {
                  e.preventDefault()
                  restoreEditFocus.current = true
                  setDraft(result.caption ?? '')
                  setEditing(false)
                }
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commitCaption() }
              }}
            />
            <div className="plate__edit-actions">
              <button className="btn btn--secondary" onClick={commitCaption}>{t("保存")}</button>
              <button className="btn btn--ghost" onClick={() => { restoreEditFocus.current = true; setEditing(false) }}>{t("取消")}</button>
            </div>
            </div>
          ) : (
            <button
              ref={editButton}
              className="plate__text"
              onClick={() => {
                setDraft(result.caption ?? '')
                setEditing(true)
              }}
              title={t("点击编辑")}
              aria-label={t("编辑 {0} 的描述", { 0: result.name })}
            >
              {result.caption || <span className="plate__empty">{t("未生成")}</span>}
            </button>
          )
        ) : (
          <div className="plate__tags">
            {result.tags.map((tag) => (
              <span key={tag.name} className={`tag tag--c${tag.category}`}>
                <span className="tag__name">{tag.name}</span>
                <button
                  className="tag__x"
                  onClick={() => onRemoveTag(tag.name)}
                  aria-label={t("移除 {0}", { 0: tag.name })}
                >
                  <IconX size={8} />
                </button>
              </span>
            ))}
            {adding ? (
              <form onSubmit={commitTag}>
                <input
                  className="tagadd__input"
                  value={newTag}
                  autoFocus
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); restoreAddFocus.current = true; setNewTag(''); setAdding(false) } }}
                  placeholder={t("标签…")}
                  aria-label={t("添加标签")}
                />
                <button className="tagadd__save" type="submit" aria-label={t("保存标签")} title={t("保存标签")}><IconCheck size={14} /></button>
                <button className="tagadd__save" type="button" aria-label={t("取消添加标签")} title={t("取消添加标签")} onClick={() => { restoreAddFocus.current = true; setNewTag(''); setAdding(false) }}><IconX size={14} /></button>
              </form>
            ) : (
              <button ref={addButton} className="tag tag--add" onClick={() => setAdding(true)} aria-label={t("添加标签")} title={t("添加标签")}>
                <IconPlus size={9} />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
