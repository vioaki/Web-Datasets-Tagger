import { t } from '../i18n/translate'
import { useRef, useState } from 'react'
import { IconFolder, IconUpload } from './Icons'
import { chooseFolder, supportsFolders, type FolderImport } from '../core/folders'

interface Props {
  onFiles: (files: File[], folder?: FolderImport) => void
  onError: (message: string) => void
  disabled?: boolean
  compact?: boolean
}

async function entryFiles(entry: FileSystemEntry, parent = ''): Promise<File[]> {
  const path = parent + entry.name
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject))
    Object.defineProperty(file, 'webkitRelativePath', { value: path })
    return [file]
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader()
  const files: File[] = []
  while (true) {
    const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject))
    if (!entries.length) break
    for (const child of entries) files.push(...await entryFiles(child, path + '/'))
  }
  return files
}

export function DropZone({ onFiles, onError, disabled, compact }: Props) {
  const [over, setOver] = useState(false)
  const [scanning, setScanning] = useState(false)
  const depth = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement | null>(null)
  const busy = disabled || scanning

  async function selectFolder() {
    if (!supportsFolders()) { folderRef.current?.click(); return }
    setScanning(true)
    try { const folder = await chooseFolder(); onFiles(folder.files, folder) }
    catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) onError(t("无法读取文件夹，请重试或选择图片"))
    } finally { setScanning(false) }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    depth.current = 0
    setOver(false)
    if (busy) return
    // Capture handles synchronously; the browser clears DataTransfer after dispatch.
    const entries = Array.from(e.dataTransfer.items).map((item) => item.webkitGetAsEntry?.()).filter((entry): entry is FileSystemEntry => !!entry)
    const fallback = Array.from(e.dataTransfer.files)
    setScanning(true)
    try {
      const files: File[] = []
      if (entries.length) for (const entry of entries) files.push(...await entryFiles(entry))
      else files.push(...fallback)
      onFiles(files)
    } catch { onError(t("无法读取文件夹，请使用「选择文件夹」重新导入")) }
    finally { setScanning(false) }
  }

  return (
    <div className={`drop${over ? ' is-over' : ''}${busy ? ' is-disabled' : ''}${compact ? ' drop--compact' : ''}`}
      onDragEnter={(e) => { e.preventDefault(); depth.current++; if (!busy) setOver(true) }}
      onDragLeave={(e) => { e.preventDefault(); depth.current--; if (depth.current <= 0) setOver(false) }}
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => void handleDrop(e)}>
      <div className="drop__glyph" aria-hidden="true"><IconUpload size={22} /></div>
      <div className="drop__copy">
        <p className="drop__title">{scanning ? t("正在读取文件夹…") : compact ? t("继续添加图片") : t("把图片拖到这里")}</p>
      </div>
      <div className="drop__actions">
        <button className={`btn ${compact ? 'btn--secondary' : 'btn--primary'}`} onClick={() => inputRef.current?.click()} disabled={busy}><IconUpload size={15} />{t("选择图片")}</button>
        <button className="btn btn--secondary" onClick={() => void selectFolder()} disabled={busy}><IconFolder size={15} />{t("选择文件夹")}</button>
      </div>
      <input ref={inputRef} aria-label={t("选择图片文件")} type="file" accept="image/*" multiple hidden disabled={busy}
        onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length && !busy) onFiles(files); e.target.value = '' }} />
      <input ref={(node) => { folderRef.current = node; node?.setAttribute('webkitdirectory', '') }} aria-label={t("选择图片文件夹")} type="file" multiple hidden disabled={busy}
        onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length && !busy) onFiles(files); e.target.value = '' }} />
    </div>
  )
}
