import { t } from '../i18n/translate'
import { Dialog } from './Dialog'
import { IconGithub, IconChevron } from './Icons'

export function AboutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={t("关于")}>
      <div className="about">
        <h3 className="about__name">Web Datasets Tagger</h3>
        <dl className="about__modes">
          <div><dt>Captions</dt><dd>{t("通过视觉 API 生成图片描述。")}</dd></div>
          <div><dt>Booru Tags</dt><dd>{t("在浏览器中运行模型，生成标签。")}</dd></div>
        </dl>
        <a className="repo-link" href="https://github.com/vioaki/Web-Datasets-Tagger" target="_blank" rel="noopener noreferrer" aria-label={t("在 GitHub 打开 vioaki/Web-Datasets-Tagger（新标签页）")}>
          <IconGithub size={24} />
          <span><strong>Web-Datasets-Tagger</strong><span>vioaki / GitHub</span></span>
          <IconChevron size={16} />
        </a>
        <details className="about__details">
          <summary>{t("使用与数据")}</summary>
          <div className="prose">
            <p>{t("导入图片或文件夹，完成后编辑结果并导出 ZIP。支持的浏览器可通过「选择文件夹」导入并写回 .txt；写回会覆盖已有同名文件。")}</p>
            <p>{t("描述编辑支持 ⌘ / Ctrl + Enter 保存，Esc 取消。")}</p>
            <p>{t("Captions 会把图片和 API Key 发送到你配置的端点。Booru Tags 在本机推理；首次使用会下载模型。")}</p>
            <p>{t("设置保存在当前浏览器，模型保存在 IndexedDB。刷新页面后需要重新导入图片。")}</p>
            <p>{t("应用与使用过的推理资源可离线加载；Booru 模型需先缓存，Captions 仍需连接 API。")}</p>
          </div>
        </details>
      </div>
    </Dialog>
  )
}
