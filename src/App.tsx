import { t } from './i18n/translate'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { DropZone } from './components/DropZone'
import { ProgressBar } from './components/ProgressBar'
import { Gallery } from './components/Gallery'
import { SettingsPanel } from './components/SettingsPanel'
import { Toasts } from './components/Toasts'
import { AboutSheet } from './components/AboutSheet'
import { Dialog } from './components/Dialog'
import { TopBar } from './components/TopBar'
import { IconBack, IconDownload, IconFolder, IconPlay, IconStop, IconTrash, IconX } from './components/Icons'
import { useApp } from './store/useApp'
import type { FolderImport, WriteTarget } from './core/folders'
import { useLocale } from './i18n'

type View = 'library' | 'settings'

export default function App() {
  useLocale((state) => state.locale)
  const [view, setView] = useState<View>('library')
  const [help, setHelp] = useState(false)
  const [filter, setFilter] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [writeTargets, setWriteTargets] = useState<WriteTarget[] | null>(null)
  const scrollPositions = useRef({ library: 0, settings: 0 })
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousView = useRef(view)

  function changeView(next: View) {
    if (next === view) return
    scrollPositions.current[view] = window.scrollY
    setView(next)
  }

  useLayoutEffect(() => {
    if (previousView.current === view) return
    previousView.current = view
    window.scrollTo({ top: scrollPositions.current[view], behavior: 'instant' })
    headingRef.current?.focus({ preventScroll: true })
  }, [view])

  const engine = useApp((s) => s.engine)
  const setEngine = useApp((s) => s.setEngine)
  const results = useApp((s) => s.results)
  const progress = useApp((s) => s.progress)
  const runtime = useApp((s) => s.runtime)
  const settings = useApp((s) => s.settings)
  const importFiles = useApp((s) => s.importFiles)
  const importing = useApp((s) => s.importing)
  const run = useApp((s) => s.run)
  const exportZip = useApp((s) => s.exportZip)
  const download = useApp((s) => s.download)
  const cancelRun = useApp((s) => s.cancelRun)
  const clearAll = useApp((s) => s.clearAll)
  const writing = useApp((s) => s.writing)
  const writableCount = useApp((s) => s.writableCount)
  const prepareWriteback = useApp((s) => s.prepareWriteback)
  const writeBack = useApp((s) => s.writeBack)
  const toasts = useApp((s) => s.toasts)
  const dismissToast = useApp((s) => s.dismissToast)
  const pushToast = useApp((s) => s.pushToast)

  const running = progress.phase === 'running'
  const hasResults = results.length > 0
  const complete = results.filter((r) => r.status === 'done' && r.outputEngine === engine).length
  const processableCount = results.filter((r) => r.thumbUrl).length
  const allDone = processableCount > 0 && complete === processableCount
  const needsEndpoint = engine === 'caption' && (!settings.apiUrl.trim() || !settings.apiModel.trim())
  const indices = useMemo(() => new Map(results.map((r, i) => [r.id, i])), [results])

  // Filtering by name or caption text — the fastest way to find one plate
  // in a large batch.
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return results
    return results.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.caption ?? '').toLowerCase().includes(q) ||
        r.tags.some((t) => t.name.toLowerCase().includes(q)),
    )
  }, [results, filter])

  function handleFiles(files: File[], folder?: FolderImport) {
    void importFiles(files, folder)
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">{t("跳到主要内容")}</a>
      <TopBar
        view={view}
        onViewChange={changeView}
        onOpenHelp={() => setHelp(true)}
        engine={engine}
        onEngineChange={setEngine}
        backend={runtime.backend}
        workerCount={runtime.workers}
        disabled={running || writing}
      />

      <main className="main" id="main">
        {view === 'settings' ? (
          <div className="wrap">
            <header className="masthead">
              <button className="back-link" onClick={() => changeView('library')}><IconBack size={15} />{engine === 'caption' ? 'Captions' : 'Booru Tags'}</button>
              <h1 ref={headingRef} tabIndex={-1} className="masthead__title">{t("设置")}</h1>
            </header>
            <SettingsPanel />
          </div>
        ) : (
          <div className="wrap">
            <header className="masthead">
              <h1 ref={headingRef} tabIndex={-1} className="masthead__title">
                {engine === 'caption' ? 'Captions' : 'Booru Tags'}
                {hasResults && <span className="masthead__count tnum" aria-label={t("{0} 张图片", { 0: results.length })}>{results.length}</span>}
              </h1>
            </header>

            <DropZone
              onFiles={handleFiles}
              onError={(message) => pushToast(message, 'err')}
              disabled={running || importing || writing}
              compact={hasResults}
            />

            {hasResults && (
              <>
                <div className="toolbar">
                  <button
                    className={`btn ${running ? 'btn--secondary' : 'btn--primary'}`}
                    onClick={running ? cancelRun : needsEndpoint ? () => changeView('settings') : () => void run(!allDone)}
                    disabled={importing || writing || !processableCount}
                  >
                    {running ? (
                      <>
                        <IconStop size={13} />{t("停止")}</>
                    ) : (
                      <>
                        <IconPlay size={13} />
                        {importing ? t("正在导入…") : needsEndpoint ? t("配置 API") : allDone ? t("重新处理全部") : progress.phase === 'cancelled' ? t("继续处理") : progress.phase === 'error' ? t("重试未完成") : engine === 'caption' ? t("开始生成描述") : t("开始打标")}
                      </>
                    )}
                  </button>

                  {writableCount > 0 && <button className="btn btn--secondary" disabled={!complete || running || importing || writing} onClick={() => {
                    try {
                      const targets = prepareWriteback()
                      if (targets.length) setWriteTargets(targets)
                      else pushToast(t("所选文件夹中还没有可写回的结果"), 'info')
                    } catch (error) { pushToast(error instanceof Error ? error.message : String(error), 'err') }
                  }}><IconFolder size={13} />{writing ? t("正在写入…") : t("写回文件夹")}</button>}

                  <button className="btn btn--secondary" disabled={!complete || running || exporting} onClick={async () => {
                    setExporting(true)
                    try { await exportZip() } finally { setExporting(false) }
                  }}>
                    <IconDownload size={13} />
                    {exporting ? t("正在导出…") : t("导出 ZIP")}
                  </button>

                  <button
                    className="btn btn--ghost"
                    onClick={() => setConfirmClear(true)}
                    disabled={running || importing || exporting || writing}
                    aria-haspopup="dialog"
                  >
                    <IconTrash size={13} />{t("清空")}</button>

                  <span className="toolbar__spacer" />

                  <div className="filter">
                    <input
                      className="filter__input"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder={t("搜索图片或描述")}
                      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setFilter('') } }}
                      aria-label={t("筛选结果")}
                    />
                    {filter && <button className="filter__clear" onClick={() => setFilter('')} aria-label={t("清除筛选")} title={t("清除筛选")}><IconX size={14} /></button>}
                  </div>
                </div>

                {importing && <p className="import-status" role="status">{t("正在整理缩略图 ·")}{results.filter((r) => r.thumbUrl || r.error).length}/{results.length}</p>}
                {download && <div className="download-status" role="status">
                  <span>{download.label}</span>
                  {download.loaded > 1024 && <span className="tnum">{(download.loaded / 1048576).toFixed(1)} MB{download.total ? ` / ${(download.total / 1048576).toFixed(1)} MB` : ''}</span>}
                  <progress aria-label={download.label} max={download.total ?? undefined} value={download.total ? download.loaded : undefined} />
                </div>}
                <ProgressBar
                  progress={progress}
                  engine={engine}
                  parallel={
                    engine === 'caption' ? settings.apiConcurrency : runtime.workers
                  }
                  onCancel={cancelRun}
                />

                {shown.length === 0 ? (
                  <div className="search-empty" role="status">
                    <p>{t("没有匹配结果")}</p>
                    <button className="btn btn--ghost" onClick={() => setFilter('')}>{t("清除筛选")}</button>
                  </div>
                ) : (
                  <Gallery results={shown} indices={indices} engine={engine} settings={settings} />
                )}
              </>
            )}
          </div>
        )}
      </main>

      <AboutSheet open={help} onClose={() => setHelp(false)} />
      <Dialog open={!!writeTargets} title={t("写回图片文件夹？")} onClose={() => setWriteTargets(null)}>
        <p className="confirm-copy">{t('将写入 {0} 个同名 .txt 文件，覆盖已有内容。', { 0: writeTargets?.length ?? 0 })}</p>
        <div className="dialog-actions">
          <button className="btn btn--secondary" onClick={() => setWriteTargets(null)}>{t("取消")}</button>
          <button className="btn btn--primary" onClick={() => {
            if (writeTargets) void writeBack(writeTargets)
            setWriteTargets(null)
          }}>{t("确认写入")}</button>
        </div>
      </Dialog>
      <Dialog open={confirmClear} title={t("清空当前图片？")} onClose={() => setConfirmClear(false)}>
        <p className="confirm-copy">{t('将移除当前 {0} 张图片及其处理结果。', { 0: results.length })}</p>
        <div className="dialog-actions">
          <button className="btn btn--secondary" onClick={() => setConfirmClear(false)}>{t("保留图片")}</button>
          <button className="btn btn--danger" onClick={() => {
            clearAll()
            setFilter('')
            setConfirmClear(false)
            pushToast(t("已清空"), 'info')
            requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }))
          }}>{t("确认清空")}</button>
        </div>
      </Dialog>
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
