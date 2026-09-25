<p align="center">
  <img src="public/icon.svg" width="72" height="72" alt="Web Datasets Tagger 图标">
</p>

<h1 align="center">Web Datasets Tagger</h1>

<p align="center">为图像数据集批量生成、校对与导出描述。</p>

<p align="center">
  <a href="https://vioaki.github.io/Web-Datasets-Tagger/"><strong>在线使用 ↗</strong></a>
  &nbsp; · &nbsp;
  <a href="https://github.com/vioaki/Web-Datasets-Tagger/issues">反馈问题</a>
  &nbsp; · &nbsp;
  <a href="LICENSE">License</a>
</p>

Web Datasets Tagger 是一个在浏览器中运行的图像数据集标注工具。连接你选择的视觉模型，为图片生成自然语言描述；也可以使用本地模型生成 Booru 标签，用于整理训练数据、准备 LoRA 数据集或为图片补充文字标注。

**导入图片 → 批量生成 → 逐张校对 → 导出同名 `.txt`**

[开始使用](#开始使用) · [Captions](#captions) · [Booru Tags](#booru-tags) · [编辑与导出](#编辑与导出) · [离线使用](#离线使用) · [常见问题](#常见问题) · [本地运行](#本地运行)

## 功能

- **自然语言描述** — 连接支持图片输入的 Chat Completions API，自定义提示词、角色名与采样参数。
- **本地标签生成** — 内置 7 个模型预设，支持导入 ONNX 与标签 CSV，使用 WebGPU 或 WASM 推理。
- **并行批处理** — API 并发数可自由填写；本地模型使用多个 Worker。支持停止、继续和失败重试。
- **边看边校对** — 在画册式图库中编辑描述、增删标签、复制文本，按文件名或内容搜索。
- **同名文本导出** — 打包下载 `.txt`，保留文件夹层级；支持的浏览器也可直接写回图片目录。
- **离线与双语** — 本地模型缓存后可离线使用，界面支持简体中文和 English。

## 开始使用

默认进入 **Captions**，通过视觉 API 生成描述：

1. 打开[在线应用](https://vioaki.github.io/Web-Datasets-Tagger/)，点击右上角的**设置**。
2. 将预填的示例 **API URL** 替换为实际服务地址，填写**模型名称**以及端点要求的 **API Key**。
3. 返回 **Captions**，拖入图片或文件夹，也可以点击「选择图片」「选择文件夹」。
4. 点击**开始生成描述**，等待结果。中途可点击「停止」，随后继续处理未完成项。
5. 点击图片下方的描述进行修改，保存后点击**导出 ZIP**。

如果希望在设备上生成标签，切换到 **Booru Tags**，选择模型后点击「开始打标」即可，无需填写 API 配置。

支持导入 **JPG / JPEG、PNG、WebP、GIF、BMP、AVIF**，实际解码能力取决于浏览器。文件夹会递归读取其中的图片；已有 `.txt` 不会导入为描述。

## Captions

### 连接视觉模型

使用支持图片输入的 **OpenAI-compatible Chat Completions** 端点。请求直接由浏览器发送到你填写的地址。

| 设置 | 说明 |
| --- | --- |
| API URL | 默认预填 `https://api.example.com/v1/chat/completions`，请替换为实际服务的完整请求地址；不会自动补全路径 |
| API Key | 使用服务商提供的密钥；无需鉴权的端点可以留空 |
| 模型名称 | 服务端实际提供、且支持图片输入的模型 ID |
| 并发请求数 | 默认 `8`，可直接输入正整数，**应用不设上限**；`64` 只是快捷选项 |
| 失败重试次数 | 默认 `2`，即首次请求失败后最多再尝试两次；`0` 表示不重试 |

端点需要允许应用所在域名的跨域请求（CORS）。仅支持纯文本、Responses API 或厂商原生协议的地址不能直接用于这里，需要对应的 Chat Completions 兼容地址。

### 调整描述风格

**系统提示词**决定描述语言、长度与关注内容。默认提示词要求输出一段客观、详细的描述；需要中文结果时，可以改为：

```text
请用中文为这张图片写一段准确、客观的训练集描述。
包括可见主体、外观、动作、环境、光线与构图，不推测画面外的信息。
只输出描述正文，不添加标题、列表或评价。
```

**角色名**用于指定主要主体的称呼。提示词中的 `{ROLE_NAME}` 会替换为填写的名称；如果提示词未包含这个占位符，应用会附加一条使用该名称称呼主体的指令。

**自定义采样参数**默认关闭，此时使用服务端默认值。开启后发送 `temperature` 和 `top_p`，具体支持情况取决于端点。

<details>
<summary>图片尺寸与请求行为</summary>

- 图片以 Base64 Data URL 发送，使用非流式 Chat Completions 请求。
- 图库中的 512px 缩略图仅用于预览，**不会缩小 API 上传图片**。JPEG、PNG、WebP、GIF 通常按原文件发送，其他可解码格式转为原尺寸 JPEG。
- 网络错误、限流和部分临时服务错误会退避重试；鉴权错误需要先修正配置。
- 请求不会跟随重定向，请填写最终端点地址。
- API 并发与本地模型的 Worker 数量分别设置。实际处理速度取决于端点限流、网络和设备资源。

</details>

## Booru Tags

兼容需要逗号分隔标签的工作流。图片预处理和模型推理都在当前设备上完成。

### 选择模型

在设置中选择预设模型，首次开始打标时自动下载并缓存。默认使用 `wd-swinv2-tagger-v3`；可开启 **Hugging Face 镜像**，通过 `hf-mirror.com` 下载。

<details>
<summary>查看 7 个预设模型</summary>

| 模型 | 来源 |
| --- | --- |
| `wd-swinv2-tagger-v3` | [SmilingWolf](https://huggingface.co/SmilingWolf/wd-swinv2-tagger-v3) |
| `wd-eva02-large-tagger-v3` | [SmilingWolf](https://huggingface.co/SmilingWolf/wd-eva02-large-tagger-v3) |
| `wd-vit-large-tagger-v3` | [SmilingWolf](https://huggingface.co/SmilingWolf/wd-vit-large-tagger-v3) |
| `wd-convnext-tagger-v3` | [SmilingWolf](https://huggingface.co/SmilingWolf/wd-convnext-tagger-v3) |
| `wd-v1-4-moat-tagger-v2` | [SmilingWolf](https://huggingface.co/SmilingWolf/wd-v1-4-moat-tagger-v2) |
| `wd-v1-4-convnextv2-tagger-v2` | [SmilingWolf](https://huggingface.co/SmilingWolf/wd-v1-4-convnextv2-tagger-v2) |
| `Z3D-E621-Convnext` | [toynya](https://huggingface.co/toynya/Z3D-E621-Convnext) |

</details>

也可以将「模型来源」切换为**本地模型**，选择配套的 `.onnx` 与标签 `.csv`，点击「导入模型」。

<details>
<summary>本地模型兼容要求</summary>

当前支持 WD 风格的图像标签模型：

- 单输入 `float32`，形状为 `[1, 高, 宽, 3]`（NHWC），高、宽需匹配设置中的输入尺寸。
- 图片等比例缩放，以白色补成正方形；使用 **BGR** 通道顺序和 **0–255** 像素值。
- 第一个输出为 `float32` 标签分数，项数与 CSV 数据行数一致。
- CSV 的**行顺序必须对应模型输出顺序**。推荐使用模型随附的标签表，包含 `name`、`category` 列。

默认输入尺寸为 `448`。需要 NCHW、RGB、0–1 输入、多输入或其他预处理的 ONNX 模型不能直接使用。

</details>

### 标签与性能设置

| 设置 | 说明 |
| --- | --- |
| 通用 / 角色阈值 | 默认 `0.35` / `0.85`；提高阈值会减少入选标签，修改后需重新处理 |
| 触发词 | 可添加在标签前或后，以逗号或空格分隔；默认不添加 |
| 括号转义 | 默认开启，导出时将 `(`、`)` 转为 `\(`、`\)` |
| 执行后端 | 自动尝试 WebGPU，失败后回退 WASM；也可手动选择 WASM |
| Worker 数量 | `0` 为自动，也可手动填写；每个 Worker 独立加载模型会话 |

更多 Worker 会增加内存或显存占用。运行大模型或遇到初始化失败时，可将数量设为 `1`，并尝试 WASM 后端。

## 编辑与导出

### 校对结果

| 操作 | 方式 |
| --- | --- |
| 编辑描述 | 点击正文；点击「保存」或按 `⌘ / Ctrl + Enter` 保存，`Esc` 取消 |
| 增删标签 | 点击 `×` 删除，`+` 添加；新增标签按 `Enter` 保存 |
| 复制文本 | 点击图片上的复制按钮，复制当前模式的完整输出 |
| 搜索 | 按文件名、描述或标签筛选；搜索框内按 `Esc` 清除筛选 |
| 继续批次 | 停止后继续处理未完成项；失败项可重试 |
| 全部重做 | 当前模式全部完成后，点击「重新处理全部」 |

修改后的文本会用于复制和导出。触发词与括号转义直接作用于标签输出，调整后无需重新推理。

每张图片只保留最近一次生成的结果。需要同时保存 Captions 与 Booru Tags 时，请先导出一种，再切换模式生成另一种；重新处理也会替换已有编辑。

### 导出 ZIP

下载当前模式下所有已完成结果，每张图片对应一个 UTF-8 `.txt`。ZIP 只包含文本，不包含原始图片；文件夹导入会保留目录层级：

```text
导入图片                         导出文本
dataset/                        dataset/
├── portrait.jpg                ├── portrait.txt
└── scenes/                     └── scenes/
    └── garden.png                  └── garden.txt
```

同一路径下的同名结果会自动编号，如 `portrait.txt`、`portrait (2).txt`。搜索仅影响图库显示，导出仍包含当前模式的全部已完成结果。

### 写回文件夹

使用支持 File System Access API 的浏览器（如桌面版 Chrome / Edge），通过**选择文件夹**导入后，可点击**写回文件夹**，确认并授权，在原图旁创建同名 `.txt`。

写回会覆盖已有同名文本。若多张图片对应同一个 `.txt`，应用会提示改用 ZIP；成功写入后，图片会显示保存标记。通过拖放导入或浏览器不支持目录写入时，使用 ZIP 导出即可。

## 离线使用

1. 联网打开应用，等待设置中出现「离线应用已就绪」。
2. 选择 **Booru Tags**，下载或导入模型，并在准备离线使用的后端上成功处理一次图片。
3. 保留浏览器站点数据。断网后重新打开应用、导入图片，即可使用已缓存模型。

支持安装的浏览器会在设置中显示「安装应用」，无需安装也能离线使用。Captions 仍需能够连接配置的 API；更换模型或推理运行资源更新后，可能需要再次联网准备。

发现新版本时，可点击「更新应用（将重新载入）」。**刷新、关闭或更新页面前，请先导出当前结果。** 图片与结果不会跨页面保存。

### 数据存储

| 数据 | 保存方式 |
| --- | --- |
| 图片与处理结果 | 保留在当前页面；Captions 会将图片发送到所填端点，Booru 推理留在设备中 |
| 设置与 API Key | 保存在当前站点的 `localStorage`；密钥输入框虽遮蔽显示，存储时并未加密 |
| 模型与标签表 | 缓存在 IndexedDB，后续可复用 |
| 应用与推理资源 | 由浏览器缓存，用于离线打开和本地推理 |

应用不收集遥测。Captions 的图片、提示词与密钥直接发送给所选端点，数据处理与费用由该服务决定。清理站点数据会清除设置和模型缓存；不同浏览器、域名或端口之间不共享缓存。

## 常见问题

<details>
<summary>API 无法连接，或返回 401 / 403 / 429</summary>

确认 URL 是完整的 Chat Completions 地址，模型支持图片输入。`401 / 403` 通常需要检查密钥与访问权限；`429` 表示服务端限流，可调整并发、等待后重试。

网络或 CORS 错误需要检查端点是否允许应用域名，以及 `Content-Type`、`Authorization` 等请求头。HTTPS 页面访问 HTTP 服务也可能被浏览器拦截。

</details>

<details>
<summary>切换为中文界面后，为什么描述仍然是英文？</summary>

界面语言和生成语言分别控制。在系统提示词中明确要求「用中文描述」，即可调整输出语言。

</details>

<details>
<summary>为什么模型需要重新下载？</summary>

浏览器存储空间不足、隐私模式或清理站点数据，都可能导致模型缓存无法保留。服务器支持 Range 和必要的跨域校验信息时，未完成的下载可续传；否则会重新下载完整文件。

</details>

## 本地运行

使用 **Node.js 22.12+ 的 22.x 版本，或 Node.js 24.x**。

```sh
git clone https://github.com/vioaki/Web-Datasets-Tagger.git
cd Web-Datasets-Tagger
npm ci
npm run dev
```

若使用 npm 12，将安装命令改为 `npm ci --allow-remote=all`，以避免远程依赖被拦截而出现 `EALLOWREMOTE`。

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm test -- --run` | 运行测试 |
| `npm run build` | 构建到 `dist/` |
| `npm run preview` | 预览生产构建，包括离线功能 |

开发服务器不启用离线缓存。需要测试离线功能时，先构建，再使用本地预览。
