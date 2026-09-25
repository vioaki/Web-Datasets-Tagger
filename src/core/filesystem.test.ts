import { describe, expect, it, vi } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'
import { createExportArchive } from './filesystem'
import { prepareWriteback, writeToFolders, type DirectoryHandle } from './folders'
import { DEFAULT_SETTINGS } from '../store/settings'
import type { TagResult } from '../lib/types'

const result = (id: string, name: string, relativePath = name): TagResult => ({ id, name, relativePath, caption: 'Edited description.', outputEngine: 'caption', status: 'done', thumbUrl: '', tags: [] })
function folder(permission = 'granted', failClose = false) {
  const stream = { write: vi.fn(), close: vi.fn(async () => { if (failClose) throw new Error('disk full') }), abort: vi.fn(async () => {}) }
  const directory = { requestPermission: vi.fn(async () => permission), getFileHandle: vi.fn(async () => ({ createWritable: async () => stream })) }
  return { directory: directory as unknown as DirectoryHandle, stream }
}

describe('dataset export', () => {
  it('preserves folders, edits and duplicate basenames in ZIP, excluding unfinished results', async () => {
    const results = [result('1', 'a.png', 'set/a.png'), result('2', 'a.jpg', 'set/a.jpg'), { ...result('3', 'bad.png'), status: 'error' as const }]
    const files = unzipSync(await createExportArchive(results, 'caption', DEFAULT_SETTINGS))
    expect(Object.keys(files)).toEqual(['set/a.txt', 'set/a (2).txt'])
    expect(strFromU8(files['set/a.txt'])).toBe('Edited description.')
  })
  it('applies trigger position and parentheses escaping to edited tags', async () => {
    const r = { ...result('1', 'art.png'), outputEngine: 'booru' as const, tags: [{ name: 'subject (art)', category: 0, score: 1 }] }
    const files = unzipSync(await createExportArchive([r], 'booru', { ...DEFAULT_SETTINGS, triggerWord: 'style', triggerPosition: 'prefix' }))
    expect(strFromU8(files['art.txt'])).toBe('style, subject \\(art\\)')
  })
  it('refuses colliding writeback paths before changing files', () => {
    const { directory } = folder()
    const targets = new Map(['1', '2'].map(id => [id, { directory, root: directory }]))
    expect(() => prepareWriteback([result('1', 'A.png'), result('2', 'a.jpg')], 'caption', DEFAULT_SETTINGS, targets)).toThrow('同名')
    expect(directory.getFileHandle).not.toHaveBeenCalled()
  })
  it('checks write permission before opening output files', async () => {
    const { directory } = folder('denied')
    const targets = prepareWriteback([result('1', 'a.png')], 'caption', DEFAULT_SETTINGS, new Map([['1', { directory, root: directory }]]))
    await expect(writeToFolders(targets, vi.fn())).rejects.toThrow('权限')
    expect(directory.getFileHandle).not.toHaveBeenCalled()
  })
  it('marks files saved only after close and reports failed writes independently', async () => {
    const good = folder(); const bad = folder('granted', true)
    const targets = prepareWriteback([result('1', 'a.png'), result('2', 'b.png')], 'caption', DEFAULT_SETTINGS,
      new Map([['1', { directory: good.directory, root: good.directory }], ['2', { directory: bad.directory, root: bad.directory }]]))
    const onSaved = vi.fn()
    expect(await writeToFolders(targets, onSaved)).toEqual({ saved: 1, failed: 1 })
    expect(onSaved.mock.calls).toEqual([['1']])
    expect(good.stream.write).toHaveBeenCalledWith('Edited description.')
    expect(bad.stream.abort).toHaveBeenCalled()
  })
})
