import { t } from '../i18n/translate'
import { isImage } from './images'
import { resultText } from './filesystem'
import type { EngineId, Settings, TagResult } from '../lib/types'

export interface DirectoryHandle extends FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemFileHandle | DirectoryHandle>
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
}
export interface FolderImport { files: File[]; root: DirectoryHandle; directories: Map<File, DirectoryHandle> }
export interface WriteTarget { id: string; name: string; text: string; directory: DirectoryHandle; root: DirectoryHandle }

type FolderWindow = Window & { showDirectoryPicker?: (options: { mode: 'read' }) => Promise<DirectoryHandle> }
export const supportsFolders = () => typeof (window as FolderWindow).showDirectoryPicker === 'function'

export async function chooseFolder(): Promise<FolderImport> {
  const root = await (window as FolderWindow).showDirectoryPicker!({ mode: 'read' })
  const files: File[] = []
  const directories = new Map<File, DirectoryHandle>()
  async function walk(directory: DirectoryHandle, path: string) {
    const entries = []
    for await (const entry of directory.values()) entries.push(entry)
    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    for (const entry of entries) {
      if (entry.kind === 'directory') await walk(entry as DirectoryHandle, `${path}${entry.name}/`)
      else {
        const file = await (entry as FileSystemFileHandle).getFile()
        if (!isImage(file)) continue
        Object.defineProperty(file, 'webkitRelativePath', { value: path + file.name })
        files.push(file); directories.set(file, directory)
      }
    }
  }
  await walk(root, root.name + '/')
  return { files, root, directories }
}

export function prepareWriteback(results: TagResult[], engine: EngineId, settings: Settings,
  targets: Map<string, { directory: DirectoryHandle; root: DirectoryHandle }>): WriteTarget[] {
  const seen = new Map<DirectoryHandle, Set<string>>()
  return results.filter((r) => r.status === 'done' && r.outputEngine === engine && targets.has(r.id)).map((r) => {
    const { directory, root } = targets.get(r.id)!
    const name = r.name.replace(/\.[^.]+$/, '') + '.txt'
    const names = seen.get(directory) ?? new Set<string>()
    // Case insensitive too: common macOS/Windows volumes ignore case.
    if (names.has(name.toLowerCase())) throw new Error(t("同一文件夹存在同名图片，请使用 ZIP 导出以保留全部结果"))
    names.add(name.toLowerCase()); seen.set(directory, names)
    return { id: r.id, name, text: resultText(r, engine, settings), directory, root }
  })
}

/** Called from the explicit confirmation button; never writes during inference. */
export async function writeToFolders(targets: WriteTarget[], onSaved: (id: string) => void): Promise<{ saved: number; failed: number }> {
  const roots = [...new Set(targets.map((target) => target.root))]
  for (const root of roots) {
    if (await root.requestPermission({ mode: 'readwrite' }) !== 'granted') throw new Error(t("未获得文件夹写入权限，可改用 ZIP 导出"))
  }
  let saved = 0
  let failed = 0
  for (const target of targets) {
    let stream: FileSystemWritableFileStream | undefined
    try {
      const file = await target.directory.getFileHandle(target.name, { create: true })
      stream = await file.createWritable()
      await stream.write(target.text)
      await stream.close()
      saved++; onSaved(target.id)
    } catch { failed++; await stream?.abort().catch(() => undefined) }
  }
  return { saved, failed }
}
