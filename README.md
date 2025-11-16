# Web Datasets Tagger

一款强大、便捷且注重隐私的**浏览器内图像自动标注工具**，无需后端，纯前端运行。

**直接使用：访问https://vioaki.github.io/Web-Datasets-Tagger**

---

## 核心功能：双模智能标注

根据您的需求，在两种强大的 AI 标注模式间自由切换。

| 特性 | Booru Tags (本地模式) | NL Captions (在线模式) |
| :--- | :--- | :--- |
| **核心功能** | 生成关键词标签 (e.g., `1girl, blue hair`) | 生成自然语言描述 (e.g., "A girl with blue hair...") |
| **处理位置** | **完全在您的浏览器中** (离线运行) | 通过外部 VLM API (如 GPT-4o, Gemini) |
| **优点** | **极致隐私**<br>**速度快**<br>**无额外费用** | **理解力强**<br>**描述丰富、有上下文**<br>**高度灵活** |
| **适用场景** | AI 绘画训练集准备、图像批量归档 | 语义化描述生成、内容创作辅助 |

---

## 主要特性

*   **双 AI 引擎**：内置 ONNX 模型实现本地高速打标，同时支持集成外部 VLM API 实现更智能的描述生成。
*   **强大的文件处理**：支持拖拽上传、多图预览，更能**批量处理整个文件夹**，并将标签 (`.txt`) 自动保存在原图旁。
*   **灵活的模型管理**：一键下载并缓存预设模型（支持镜像加速），也允许上传您自己的本地 ONNX 模型和标签文件。
*   **精细化控制**：可自定义标签识别阈值、添加触发词、配置 API 参数、设置角色名以引导 AI 生成等。
*   **纯净 Web 体验**：单个 `index.html` 文件，无后端依赖，确保数据 100% 留存在您的设备上（本地模式下）。

---

## 快速上手

1.  **访问**: 打开 **[在线体验地址](https://vioaki.github.io/Web-Datasets-Tagger/)**。
2.  **选择模式**: 在左侧选择 `Booru Tags` 或 `NL Captions`。
3.  **配置**:
    *   **Booru Tags**: 选择一个预设模型并点击“下载并加载”。
    *   **NL Captions**: 输入您的 API URL、Key 和模型名称。
4.  **处理**: 拖入图片进行预览，或选择文件夹进行批量处理，然后点击“开始打标”！

> **提示**: **批量处理文件夹**功能需要通过 `https://` 或本地服务器 (`localhost`) 访问，直接打开 `file:///` 路径会受浏览器安全限制。

---

## 技术栈

- **核心**: Vanilla JavaScript, ONNX Runtime Web, Fetch API
- **UI**: Tailwind CSS
- **数据**: IndexedDB, Local Storage
- **工具**: JSZip, File System Access API
