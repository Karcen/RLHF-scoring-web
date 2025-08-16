# Scoring-Web (评分网页工具)

A lightweight scoring and visualization web application for dataset annotation.  
一个轻量级的网页打分与可视化工具，用于数据集标注与人工评价。  

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
   git clone https://github.com/<your-username>/<repo-name>.git
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
