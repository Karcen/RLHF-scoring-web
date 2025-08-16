# Scoring-Web (评分网页工具)

A lightweight scoring and visualization web application for dataset annotation.  
一个轻量级的网页打分与可视化工具，用于数据集标注与人工评价。  

<img width="1920" height="892" alt="d0156f9d7b16412b814b341099f7cd07" src="https://github.com/user-attachments/assets/b2599477-9da6-42fa-9173-b71feb733a29" />



## ✨ Features / 功能特点
- **Two scoring modes / 两种打分方式**  
  - Continuous scoring (无极打分): supports fine-grained scores. Negative scores (-1) are specially handled as "harmful" labels, with a barrier between 0 and -1 to prevent misclicks.  
    连续打分（无极打分）：支持细粒度评分。负分（-1）表示“有害”，并在 0 与 -1 之间设置阻隔，避免误操作。  
  - Single-choice scoring (单选打分): supports categorical evaluation, where -1 is highlighted in red to indicate harmful content.  
    单选打分：支持类别化评价，其中 -1 用红色标注表示有害内容。  

- **User-friendly interface / 友好的界面**  
  - Built with pure HTML (integrated CSS & JS).  
  - 提示信息清晰，操作简便，本地直接运行，无需额外依赖。  

- **Export results / 结果导出**  
  - One-click export of scoring results (CSV/JSON).  
  - 计划支持一键生成可视化报告（开发中）。  

- **Visualization / 可视化**  
  - Inline charts and statistics display.  
  - 内置图表与统计展示。  

## 🚀 Usage / 使用方法
1. Clone or download this repository.  
   克隆或下载本仓库。  
   ```bash
   git clone https://github.com/Karcen/RLHF-scoring-web.git
2. Open `index.html` directly in a browser.
   直接在浏览器中打开 `index.html` 即可运行。
3. Start scoring and export your results.
   开始打分并导出结果。

## 🗂 File Structure / 文件结构

```
├── index.html      # Main webpage (CSS & JS inline)
├── Figures/        # Folder for images (if used for dataset visualization)
├── results/        # Exported results (CSV/JSON)
```

## 📌 Roadmap / 未来计划

* [ ] Support one-click generation of visualization reports (charts, summaries).
* [ ] Deploy on a server for multi-user access.
* [ ] Add customizable scoring rubrics.

## 📜 License / 许可证

MIT License. Feel free to use and modify.
MIT 许可证，欢迎自由使用与修改。

---


# RLHF-MultiRound-Scoring-Web (基于 React 的多轮图文 RLHF 数据集打分网页)

A single-file React-based annotation tool for multi-round dialogue with images.  
一个基于 React 的单文件网页工具，用于对 **多轮图文对话数据集 (multi-round multimodal dialogue dataset)** 进行 RLHF (Reinforcement Learning from Human Feedback) 打分。  

---

## ✨ Features / 功能特点
- **Multi-round dialogue annotation / 多轮对话标注**  
  Supports structured evaluation of user-assistant multi-turn dialogues with associated images.  
  支持对带图片的多轮对话进行结构化评价。  

- **JSON-driven workflow / JSON 驱动**  
  Input format is standardized JSON (see example below).  
  输入格式为标准化 JSON（见下方示例）。  

- **Scoring modes / 多种打分方式**  
  - Continuous scoring (无极打分)：可细粒度打分，支持 -1 表示“有害”。  
  - Single-choice scoring (单选打分)：分类式打分，-1 用红色高亮。  

- **Self-contained React file / 单文件 React 实现**  
  Entire app is in one `.jsx` file, convenient for quick deployment and modification.  
  整个应用封装在一个 `.jsx` 文件中，方便快速部署与修改。  

- **Export results / 结果导出**  
  Supports exporting scoring results (JSON/CSV).  
  支持导出标注结果（JSON/CSV）。  

---

## 📂 Expected Data Format / 期望数据格式
Each sample consists of an ID, metadata, and multiple dialogue rounds.  
每个样本由 ID、元信息和多轮对话组成。  

```json
[
  {
    "id": "sample-001",
    "meta": {"source": "paperX"},
    "rounds": [
      {"user": "问题1", "assistant": "回答1", "image": "Figures/img_001.png"},
      {"user": "问题2", "assistant": "回答2", "image": "Figures/img_001_b.png"}
    ]
  }
]
````

* `id`: unique identifier 样本唯一 ID
* `meta`: metadata 元信息（可选，来源/标签等）
* `rounds`: dialogue rounds 对话轮次

  * `user`: 用户输入
  * `assistant`: 模型回答
  * `image`: 可选图片路径

---

## 🚀 Usage / 使用方法

1. Clone this repository.
   克隆仓库：

   ```bash
   git clone https://github.com/<your-username>/<repo-name>.git
   ```

2. Open the `.jsx` file in a React environment (e.g., Vite, Create React App).
   在 React 环境中运行 `.jsx` 文件（如 Vite 或 Create React App）。

   Example (using Vite):

   ```bash
   npm create vite@latest my-annotator --template react
   cd my-annotator
   npm install
   # replace App.jsx with the provided RLHF scoring .jsx file
   npm run dev
   ```

3. Load your dataset JSON and start annotation.
   加载数据集 JSON，开始打分。

4. Export results with one click.
   一键导出标注结果。

---

## 📌 Roadmap / 未来计划

* [ ] Add visualization report (charts, summaries).
* [ ] Support batch dataset import/export.
* [ ] Multi-user deployment with server backend.

---

## 📜 License / 许可证

MIT License.
自由使用与修改。
