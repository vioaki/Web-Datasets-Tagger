import { t } from '../../i18n/translate'
/** Separate DB so v1.3 can still open its original model store at version 1. */
export interface PartialDownload { url: string; blob: Blob; validator: string; total: number | null }

async function access<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('TaggerDownloads', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('partials', { keyPath: 'url' })
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error(t("下载缓存被其他页面占用")))
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result) }
  })
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('partials', mode)
      const request = action(tx.objectStore('partials'))
      tx.oncomplete = () => resolve(request.result)
      tx.onabort = () => reject(tx.error ?? new Error(t("下载缓存事务已中止")))
      tx.onerror = () => reject(tx.error)
    })
  } finally { db.close() }
}

export const readPartial = (url: string) => access<PartialDownload | undefined>('readonly', (s) => s.get(url))
export const savePartial = (record: PartialDownload) => access('readwrite', (s) => s.put(record))
export const removePartial = (url: string) => access('readwrite', (s) => s.delete(url))
