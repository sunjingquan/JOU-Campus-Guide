# JOU Campus Guide Agent 说明

## 项目概况

- 江苏海洋大学校园指南全栈数字门户（同构 ES Module 渲染 + Node.js 内置 `node:sqlite` 服务端，零外部依赖）。
- 双模态信息架构：根路径 `/` 为全宽生态门户首页（即搜框、Bento 工具矩阵、三校区全景速览、社区实时热帖聚合与 App 联动）；章节内页为「左目录树 + 中正文 + 右自动锚点大纲 TOC」三栏阅读器。
- 干净路径同构直出（SSR + SPA）：服务端复用 `js/templates.js` 直出首屏 HTML、动态 `<title>` / OpenGraph 分享卡片与 `/sitemap.xml`，客户端通过 History API 秒切并自动兼容旧 `#/` 锚点跳转。
- 版控正文数据：`content/guide.json` 与 `content/campus.json`（已按近年江苏海洋大学教务迎新通告校对苍梧/通灌/宋跳院系分流）。

## 生产运行架构

- GitHub 仓库：`sunjingquan/JOU-Campus-Guide`
- 承载环境：家庭服务器 PVE `CT 105 (jhd-guide)`（`127.0.0.1:4173`，数据目录 `/var/lib/jhd-guide`）
- 公网隧道：Cloudflare Tunnel `jhd-guide-home`（`https://jianghaidai.com`）

## 安全与验证规则

- 严禁提交 `.env`、敏感凭据或运行期 `data/` 目录；严禁引入境外公共运行时 CDN。
- 所有动态渲染字段必须经 `escapeHtml()`、`highlightMatch()` 或 `safeUrl()` 安全处理。
- 本地验证命令：
  1. `node --test tests/guide.test.mjs`
  2. `node server/index.mjs` 访问 `http://127.0.0.1:4173/` 验证门户首页、干净路径 SSR、校区查询、到校交通、自定义清单、宽带账号生成器与勘误反馈。
