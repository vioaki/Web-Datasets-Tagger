import { t } from '../i18n/translate'
import type { EngineId, JobProgress } from '../lib/types'
import { IconStop } from './Icons'
import { useEffect, useState } from 'react'

interface Props {
  progress: JobProgress
  engine: EngineId
  /** Requests in flight: API concurrency, or the CPU-bound worker count. */
  parallel: number
  onCancel: () => void
}

function elapsed(p: JobProgress): string | null {
  if (p.startedAt == null) return null
  const end = p.finishedAt ?? performance.now()
  const s = (end - p.startedAt) / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  return `${m}m ${Math.round(s - m * 60)}s`
}

export function ProgressBar({ progress, engine, parallel, onCancel }: Props) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (progress.phase !== 'running') return
    const timer = window.setInterval(() => tick((v) => v + 1), 1000)
    return () => clearInterval(timer)
  }, [progress.phase])
  const { phase, completed, total, inFlight } = progress
  if (phase === 'idle' || total === 0) return null

  const pct = total ? (completed / total) * 100 : 0
  const busy = phase === 'running'
  const time = elapsed(progress)

  // Rough finish estimate once enough work has landed to mean anything.
  let eta: string | null = null
  if (busy && completed >= 3 && progress.startedAt != null) {
    const per = (performance.now() - progress.startedAt) / completed
    const left = Math.round(((total - completed) * per) / 1000)
    if (left > 0 && left < 86400) eta = left < 60 ? `${left}s` : `${Math.round(left / 60)}m`
  }

  return (
    <div className="jobbar" role="status" aria-live="polite">
      <div className="jobbar__top">
        <span className="jobbar__label">
          {busy && (engine === 'caption' ? t("正在生成描述") : t("正在打标"))}
          {phase === 'done' && t("完成")}
          {phase === 'cancelled' && t("已取消")}
          {phase === 'error' && (progress.failed ? t("{0} 张失败", { 0: progress.failed }) : t("未完成"))}
        </span>

        <span className="jobbar__meta tnum">
          <span className="jobbar__strong">
            {completed}
            <span className="jobbar__of">/{total}</span>
          </span>
          {busy && <span className="jobbar__chip">{inFlight}{t("进行中")}</span>}
          {time && <span className="jobbar__chip">{time}</span>}
          {eta && <span className="jobbar__chip">{t("约")}{eta}</span>}
        </span>

        {busy && (
          <button className="btn btn--ghost jobbar__cancel" onClick={onCancel}>
            <IconStop size={12} />{t("停止")}</button>
        )}
      </div>

      <div role="progressbar" aria-label={t("批次进度")} aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total} className={`progress${busy && completed === 0 ? ' progress--busy' : ''}`}>
        <div
          className="progress__fill"
          style={{ width: busy && completed === 0 ? undefined : `${pct}%` }}
        />
      </div>
      {progress.message && <p className="plate__error">{progress.message}</p>}

      {busy && (
        <p className="jobbar__note tnum">
          {engine === 'caption'
            ? t("并发 {0} 个请求", { 0: parallel })
            : t("{0} 个 Worker 并行", { 0: parallel })}
          　·　{Math.round(pct)}%
        </p>
      )}
    </div>
  )
}
