import { t } from '../i18n/translate'
import { useApp, DEFAULT_SYSTEM_PROMPT } from '../store/useApp'
import { DEFAULT_SETTINGS } from '../store/settings'
import { cloneElement, useId, useState, type ReactElement } from 'react'
import { MODELS } from '../core/models/registry'
import { useLocale } from '../i18n'
import { applyUpdate, installApp, usePwa } from '../core/pwa'

const TRIGGER_POSITIONS = [
  { value: 'none', label: '不添加' },
  { value: 'prefix', label: '前缀（逗号分隔）' },
  { value: 'suffix', label: '后缀（逗号分隔）' },
  { value: 'prefix_nocomma', label: '前缀（空格分隔）' },
  { value: 'suffix_nocomma', label: '后缀（空格分隔）' },
] as const

export function SettingsPanel() {
  const engine = useApp((s) => s.engine)
  const settings = useApp((s) => s.settings)
  const setSetting = useApp((s) => s.setSetting)
  const runtime = useApp((s) => s.runtime)
  const running = useApp((s) => s.progress.phase === 'running')
  const writing = useApp((s) => s.writing)
  const importModel = useApp((s) => s.importModel)
  const pushToast = useApp((s) => s.pushToast)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [tagsFile, setTagsFile] = useState<File | null>(null)
  const [loadingModel, setLoadingModel] = useState(false)
  const { locale, setLocale } = useLocale()
  const pwa = usePwa()
  const [concurrencyMax, setConcurrencyMax] = useState(() => Math.max(64, settings.apiConcurrency))

  return (
    <fieldset className="settings" disabled={running || writing || loadingModel} aria-label={t("处理设置")}>
      <div className="settings__col">
        {engine === 'caption' ? (
          <>
            <Section title={t("端点")}>
              <Field label="API URL">
                <input
                  className="input"
                  type="text"
                  placeholder={DEFAULT_SETTINGS.apiUrl}
                  value={settings.apiUrl}
                  onChange={(e) => setSetting('apiUrl', e.target.value)}
                />
              </Field>
              <Field label="API Key">
                <input
                  className="input"
                  type="password"
                  placeholder="sk-…"
                  value={settings.apiKey}
                  onChange={(e) => setSetting('apiKey', e.target.value)}
                />
              </Field>
              <Field label={t("模型名称")}>
                <input
                  className="input"
                  type="text"
                  placeholder={t("例如 gemini-2.5-pro")}
                  value={settings.apiModel}
                  onChange={(e) => setSetting('apiModel', e.target.value)}
                />
              </Field>

            </Section>

            <Section title={t("采样与重试")}>
              <Check checked={settings.useSampling} onChange={(v) => setSetting('useSampling', v)} label={t("自定义采样参数")} />
              <Slider
                label="Temperature"
                disabled={!settings.useSampling}
                value={settings.temperature}
                max={2}
                onChange={(v) => setSetting('temperature', v)}
              />
              <Slider
                label="Top P"
                disabled={!settings.useSampling}
                value={settings.topP}
                max={1}
                onChange={(v) => setSetting('topP', v)}
              />
              <Field label={t("失败重试次数")}>
                <input
                  className="input tnum"
                  type="number"
                  min={0}
                  value={settings.maxRetries}
                  onChange={(e) => setSetting('maxRetries', Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                />
              </Field>
            </Section>
          </>
        ) : (
          <>
            <Section title={t("模型")}>
              <Field label={t("模型来源")}><select className="select" value={settings.modelSource} onChange={(e) => setSetting('modelSource', e.target.value as 'preset' | 'local')}>
                <option value="preset">{t("预设模型")}</option><option value="local">{t("本地模型")}</option>
              </select></Field>
              {settings.modelSource === 'preset' ? <>
              <Field label={t("预设模型")}>
                <select className="select" value={settings.modelName} onChange={(e) => setSetting('modelName', e.target.value)}>
                  {MODELS.map(({ name: m }) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Check
                checked={settings.useMirror}
                onChange={(v) => setSetting('useMirror', v)}
                label={t("使用 Hugging Face 镜像")}
              />
              </> : <>
                <Field label={t("ONNX 模型")}><input className="input" type="file" accept=".onnx" onChange={(e) => setModelFile(e.target.files?.[0] ?? null)} /></Field>
                <Field label={t("标签 CSV")}><input className="input" type="file" accept=".csv" onChange={(e) => setTagsFile(e.target.files?.[0] ?? null)} /></Field>
                {settings.localModelName && <p className="model-name">{settings.localModelName.replace(/^local:/, '')}</p>}
                <button className="btn btn--secondary" disabled={!modelFile || !tagsFile} onClick={async () => {
                  if (!modelFile || !tagsFile) return
                  setLoadingModel(true)
                  try { await importModel(modelFile, tagsFile) }
                  catch (error) { pushToast(error instanceof Error ? error.message : String(error), 'err') }
                  finally { setLoadingModel(false) }
                }}>{loadingModel ? t("正在导入…") : t("导入模型")}</button>
              </>}
              <Field label={t("输入尺寸")}>
                <input
                  className="input tnum"
                  type="number"
                  min={128}
                  step={1}
                  value={settings.inputSize}
                  onChange={(e) => setSetting('inputSize', Number(e.target.value) || 448)}
                />
              </Field>
            </Section>

            <Section title={t("标签阈值")}>
              <Slider
                label={t("通用标签")}
                value={settings.threshold}
                max={1}
                onChange={(v) => setSetting('threshold', v)}
              />
              <Slider
                label={t("角色标签")}
                value={settings.charThreshold}
                max={1}
                onChange={(v) => setSetting('charThreshold', v)}
              />
            </Section>

            <Section title={t("输出")}>
              <Field label={t("触发词")}>
                <input
                  className="input"
                  type="text"
                  placeholder={t("例如：my_style")}
                  value={settings.triggerWord}
                  onChange={(e) => setSetting('triggerWord', e.target.value)}
                />
              </Field>
              <Field label={t("触发词位置")}>
                <select
                  className="select"
                  value={settings.triggerPosition}
                  onChange={(e) =>
                    setSetting('triggerPosition', e.target.value as typeof settings.triggerPosition)
                  }
                >
                  {TRIGGER_POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {t(p.label)}
                    </option>
                  ))}
                </select>
              </Field>
              <Check
                checked={settings.escapeParentheses}
                onChange={(v) => setSetting('escapeParentheses', v)}
                label={t("转义标签中的括号")}
              />
            </Section>
          </>
        )}
      </div>

      <div className="settings__col">
        {engine === 'caption' ? (
          <>
            <Section title={t("提示词")}>
              <Field label="System Prompt">
                <textarea
                  className="input textarea"
                  rows={9}
                  value={settings.systemPrompt}
                  onChange={(e) => setSetting('systemPrompt', e.target.value)}
                />
              </Field>
              <div className="rowbtns">
                <button
                  className="btn btn--ghost"
                  onClick={() => setSetting('systemPrompt', DEFAULT_SYSTEM_PROMPT)}
                >{t("恢复默认")}</button>
              </div>
              <Field
                label={t("角色名（可选）")}
              >
                <input
                  className="input"
                  type="text"
                  placeholder={t("例如：my character")}
                  value={settings.roleName}
                  onChange={(e) => setSetting('roleName', e.target.value)}
                />
              </Field>
            </Section>

            <Section title={t("并发")}>
            {/* Deliberately uncapped. Provider rate limits are the user's
                business — imposing a ceiling here would just get in the way. */}
            <Field
              label={t("并发请求数（无上限）")}
            >
              <div className="slider">
                <input
                  className="range"
                  type="range"
                  min={1}
                  max={concurrencyMax}
                  step={1}
                  value={settings.apiConcurrency}
                  onChange={(e) => setSetting('apiConcurrency', Number(e.target.value))}
                  aria-label={t("并发请求数")}
                />
                <input
                  className="input tnum concurrency__num"
                  type="number"
                  min={1}
                  value={settings.apiConcurrency}
                  onChange={(e) => {
                    const value = Math.max(1, Math.floor(Number(e.target.value) || 1))
                    setConcurrencyMax((max) => Math.max(max, value))
                    setSetting('apiConcurrency', value)
                  }}
                  aria-label={t("并发请求数（可手填）")}
                />
              </div>
            </Field>

            <div className="presets">
              {[1, 4, 8, 16, 32, 64].map((n) => (
                <button
                  key={n}
                  className={`pill${settings.apiConcurrency === n ? ' pill--on' : ''}`}
                  aria-pressed={settings.apiConcurrency === n}
                  onClick={() => setSetting('apiConcurrency', n)}
                >
                  {n}
                </button>
              ))}
            </div>
            </Section>
          </>
        ) : (
          <Section title={t("性能")}>
            <Field label={t('执行后端')}><select className="select" value={settings.executionProvider} onChange={(e) => setSetting('executionProvider', e.target.value as 'auto' | 'wasm')}>
              <option value="auto">{t('自动（WebGPU → WASM）')}</option><option value="wasm">WASM</option>
            </select></Field>
            <div className="meters">
              <Meter label={t("CPU 逻辑核心")} value={String(runtime.cores)} />
              <Meter
                label={t("推理后端")}
                value={runtime.backend === 'unknown' ? t("待初始化") : runtime.backend === 'mixed' ? 'GPU / WASM' : runtime.backend === 'webgpu' ? 'WebGPU' : 'WASM'}
                tone={runtime.backend === 'webgpu' ? 'ok' : 'muted'}
              />
            </div>

            <Field
              label={t("Worker 数量")}
            >
              <div className="slider">
                <input
                  className="range"
                  type="range"
                  min={0}
                  max={Math.max(2, runtime.cores, settings.workerCount)}
                  step={1}
                  value={settings.workerCount}
                  onChange={(e) => setSetting('workerCount', Number(e.target.value))}
                  aria-label={t("Worker 数量")}
                />
                <output className="slider__val tnum">{settings.workerCount || t("自动")}</output>
              </div>
            </Field>
            <Field label={t("Worker 数量（0 为自动）")}><input className="input" type="number" min={0} step={1} value={settings.workerCount} onChange={(e) => setSetting('workerCount', Math.max(0, Math.floor(Number(e.target.value) || 0)))} /></Field>
            <Field label={t("失败重试次数")}><input className="input" type="number" min={0} step={1} value={settings.maxRetries} onChange={(e) => setSetting('maxRetries', Math.max(0, Math.floor(Number(e.target.value) || 0)))} /></Field>
          </Section>
        )}
        <Section title={t("应用")}>
          <Field label={t("语言")}><select className="select" value={locale} onChange={(e) => setLocale(e.target.value as 'zh-CN' | 'en')}>
            <option value="zh-CN">{t("简体中文")}</option><option value="en">English</option>
          </select></Field>
          {pwa.ready && <p className="model-name">{t("离线应用已就绪")}</p>}
          {pwa.error && <p className="plate__error">{t("离线缓存不可用")}</p>}
          {pwa.install && <button className="btn btn--secondary" onClick={() => void installApp()}>{t("安装应用")}</button>}
          {pwa.update && <button className="btn btn--secondary" onClick={applyUpdate}>{t("更新应用（将重新载入）")}</button>}
        </Section>
      </div>
    </fieldset>
  )
}

/* ── Local building blocks ─────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel">
    <div className="panel__head"><h2 className="panel__title">{title}</h2></div>
    <div className="panel__body">{children}</div>
  </section>
}

function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = useId()
  const isControl = typeof children.type === 'string' && ['input', 'select', 'textarea'].includes(children.type)
  return <div className="field" role={isControl ? undefined : 'group'} aria-labelledby={isControl ? undefined : id}>
    {isControl ? <label htmlFor={id} className="field__label">{label}</label> : <span id={id} className="field__label">{label}</span>}
    {isControl ? cloneElement(children, { id }) : children}
  </div>
}

function Slider({ label, value, onChange, max, disabled = false }: {
  label: string; value: number; onChange: (v: number) => void; max: number; disabled?: boolean
}) {
  const id = useId()
  return <div className={`field${disabled ? ' field--disabled' : ''}`}>
    <div className="slider__head">
      <label htmlFor={id} className="field__label">{label}</label>
      <output htmlFor={id} className="slider__val tnum">{value.toFixed(2)}</output>
    </div>
    <input id={id} className="range" type="range" min={0} max={max} step={0.01} value={value}
      disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
  </div>
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <label className="check">
    <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="check__box" aria-hidden="true"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="m2.5 6.2 2.3 2.3L9.5 3.8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg></span>
    <span className="check__text">{label}</span>
  </label>
}

function Meter({ label, value, tone = 'muted' }: { label: string; value: string; tone?: 'ok' | 'muted' }) {
  return <div className="meter"><span className="meter__label">{label}</span><span className={`meter__value meter__value--${tone} tnum`}>{value}</span></div>
}
