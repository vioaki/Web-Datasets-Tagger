import { t } from '../i18n/translate'
import type { EngineId } from '../lib/types'
import { IconChip, IconInfo, IconSettings } from './Icons'

type View = 'library' | 'settings'

interface Props {
  view: View
  onViewChange: (view: View) => void
  onOpenHelp: () => void
  engine: EngineId
  onEngineChange: (engine: EngineId) => void
  backend: string
  workerCount: number
  disabled?: boolean
}

export function TopBar({
  view,
  onViewChange,
  onOpenHelp,
  engine,
  onEngineChange,
  backend,
  workerCount,
  disabled,
}: Props) {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <button
          className="topbar__brand"
          onClick={() => onViewChange('library')}
          aria-label={t("回到工作区")}
          title={t("工作区")}
        >
          <span className="topbar__word">Tagger</span>
        </button>

        {/* The engine switch is the most consequential setting, so it lives
            in the chrome rather than buried in a settings page. */}
        <div className="engine" role="group" aria-label={t("打标模式")}>
          <button
            disabled={disabled}
            aria-pressed={engine === 'caption'}
            className={`engine__opt${engine === 'caption' ? ' is-on' : ''}`}
            onClick={() => onEngineChange('caption')}
          >
            Captions
          </button>
          <button
            disabled={disabled}
            aria-pressed={engine === 'booru'}
            className={`engine__opt${engine === 'booru' ? ' is-on' : ''}`}
            onClick={() => onEngineChange('booru')}
          >
            Booru Tags
          </button>
        </div>

        <div className="topbar__right">
          <span className="runtime" title={t("运行时状态")}>
            {engine === 'booru' ? (
              <>
                <IconChip size={12} />
                <span className="runtime__backend">
                  {backend === 'unknown' ? t("待初始化") : backend === 'mixed' ? 'GPU / WASM' : backend === 'webgpu' ? 'WebGPU' : 'WASM'}
                </span>
                <span className="runtime__sep" aria-hidden="true" />
                <span className="runtime__workers tnum">{workerCount || '—'}×</span>
              </>
            ) : (
              <>
                <span className="runtime__backend">API</span>
              </>
            )}
          </span>

          <button
            className={`btn btn--ghost btn--icon${view === 'settings' ? ' is-active' : ''}`}
            onClick={() => onViewChange(view === 'settings' ? 'library' : 'settings')}
            aria-label={t("设置")}
            title={t("设置")}
            aria-pressed={view === 'settings'}
            aria-current={view === 'settings' ? 'page' : undefined}
          >
            <IconSettings size={19} />
          </button>
          <button className="btn btn--ghost btn--icon" onClick={onOpenHelp} aria-label={t("关于")} title={t("关于")} aria-haspopup="dialog">
            <IconInfo size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
