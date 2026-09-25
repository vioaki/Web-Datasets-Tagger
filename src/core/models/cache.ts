import { t } from '../../i18n/translate'
export interface CachedModel {
  name: string
  modelBlob: Blob
  tagsText: string
  inputSize: number
  lastAccessed?: Date
}

// Reuse the v1.3 store and record shape, avoiding a second copy of large weights.
const DATABASE = 'WDImageTaggerDB_V2'
const STORE = 'PredefinedModels_V2'

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'name' })
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error(t("模型缓存被其他页面占用")))
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result) }
  })
}

async function transaction<T>(mode: IDBTransactionMode, request: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const op = request(tx.objectStore(STORE))
      // A successful request can still be rolled back (quota, abort). Wait for commit.
      tx.oncomplete = () => resolve(op.result)
      tx.onabort = () => reject(tx.error ?? new Error(t("模型缓存事务已中止")))
      tx.onerror = () => reject(tx.error)
    })
  } finally { db.close() }
}

export async function getCachedModel(name: string): Promise<CachedModel | undefined> {
  const record = await transaction<CachedModel | undefined>('readonly', (s) => s.get(name))
  return record?.modelBlob instanceof Blob && record.modelBlob.size > 0 && typeof record.tagsText === 'string' ? record : undefined
}

export async function cacheModel(model: CachedModel): Promise<void> {
  await transaction('readwrite', (s) => s.put({ ...model, lastAccessed: new Date() }))
}

export async function deleteCachedModel(name: string): Promise<void> {
  await transaction('readwrite', (s) => s.delete(name))
}

export async function listCachedModels(): Promise<Array<{ name: string; size: number }>> {
  const records = await transaction<CachedModel[]>('readonly', (s) => s.getAll())
  return records.filter((r) => r.modelBlob instanceof Blob).map((r) => ({ name: r.name, size: r.modelBlob.size }))
}
