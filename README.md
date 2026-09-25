# Web Datasets Tagger

在浏览器中整理图像数据集。以视觉 API 生成自然语言描述为主，也保留本地 Booru 标签模式。无需应用服务器，可部署到 GitHub Pages。

[在线使用](https://vioaki.github.io/Web-Datasets-Tagger/) · [源代码](https://github.com/vioaki/Web-Datasets-Tagger)

## 使用

1. 在 **Captions** 的设置中填写完整的 OpenAI-compatible `chat/completions` URL、API Key 和模型名。端点需要允许浏览器跨域请求。并发请求数可直接填写，没有应用设置的上限。
2. 拖入图片，或选择图片/文件夹，点击生成。随时停止，恢复时仅处理未完成的图片。
3. 点击描述编辑；`⌘ / Ctrl + Enter` 保存，`Esc` 取消。搜索可按文件名、描述或标签筛选。
4. 导出 ZIP（保留子目录，重名结果自动编号）。支持 File System Access API 的浏览器通过“选择文件夹”导入后，还可手动写回同名 `.txt`。写回前会提示覆盖原有内容。

**Booru Tags** 使用预设模型，或导入本地 ONNX + CSV。每个 Worker 拥有独立 ONNX 会话，自动尝试 WebGPU 并回退 WASM；可设置 Worker 数、阈值、触发词与重试次数。本地模型需采用单输入 float32、NHWC/BGR、0–255 像素布局，标签行顺序必须对应输出分数。

设置中可切换中文/英文。生产版支持安装和离线打开；本地推理需先下载/导入模型并至少运行一次，以缓存推理资源。Captions 仍需要 API 连接。

## 数据与缓存

- Captions 将图片和 API Key 直接发往配置的端点；Booru 推理留在浏览器中。
- 设置（包含 API Key）保存在当前浏览器的 localStorage。没有遥测或应用后端。
- 原始图片只保留 File 引用；图库使用最长边 512px 的缩略图和虚拟列表。刷新后需要重新导入图片。
- 模型使用原 v1.3 的 IndexedDB 数据库与记录格式，已有模型无需再下载。断点下载使用独立数据库，不升级或破坏旧库。
- 服务器提供 Range 与可跨域读取的 ETag/Last-Modified、Content-Range 时可续传；否则安全地完整重下。浏览器存储配额不足时下载和推理仍可继续。
- GitHub Pages 不提供 COOP/COEP 响应头。WASM 每会话固定单线程，并行来自独立 Worker，不依赖 SharedArrayBuffer。

## 开发与验证

需要 Node.js 22.12+（CI 使用 Node 22）。

```sh
npm ci --allow-remote=all
npm run dev
npm run typecheck
npm test -- --run
npm run build
npm run preview
```

`--allow-remote=all` 用于 npm 12 的远程依赖许可；较早的 npm 可直接 `npm ci`。

Vite 的相对 `base` 使资源、Worker、WASM、字体和 Service Worker 可运行在 `/Web-Datasets-Tagger/` 等子路径。字体与 ONNX Runtime 随构建打包。

GitHub Actions 对 PR 执行类型检查、测试和构建；`main` 成功构建后部署 Pages。仓库的 **Settings → Pages → Source** 需使用 **GitHub Actions**。

`tests/fixtures/generate.py` 可重建小型测试 ONNX、标签表和图片。该模型计算图片的 BGR 通道均值，只用于检查真实 Worker/ORT 管线，不是训练过的标签模型。

## 结构

- `src/core/`：推理、任务队列、API、模型缓存/下载、图像处理、导出。
- `src/store/`：应用状态与持久化设置。
- `src/components/`、`src/design/`：画册式界面与设计变量。
- `src/i18n/`：中英翻译。
- `build/pwa.ts`：静态应用缓存与更新；不缓存 API 请求。
- `legacy/original-v1.3.html`：重构所依据的单文件原版；`archive/` 保留仓库历史版本。

遵循原仓库的 [AGPL-3.0 许可证](LICENSE)。
