# JOU Campus Guide Agent 说明

## 项目概况

- 江苏海洋大学校园指南全栈轻量站点（零外部依赖原生 ES Module 前端 + Node.js 内置 `node:sqlite` 服务端）。
- 前端入口：`index.html`，样式位于 `css/style.css`，逻辑与安全模板位于 `js/`、`services/`。
- 版控正文数据：`content/guide.json`（指南章节正文）与 `content/campus.json`（三校区、食堂、宿舍、学院专业数据），修改并推送 Git 后部署即自动生效。
- 服务端入口：`server/index.mjs`（零外部 npm 依赖，要求 Node.js 22.5+，提供 `/api/health`、`/api/guide`、`/api/campus`、`/api/feedback` 与 `/uploads/images/*`）。
- 历史数据导入脚本：`server/seed-from-cloudbase.mjs`（首次初始化本地 `data/uploads/images` 与反馈表时使用）。

## 生产运行架构

- GitHub 仓库：`sunjingquan/JOU-Campus-Guide`
- 承载环境：家庭服务器 PVE `CT 105 (jhd-guide)`（Debian 12，Nginx + Node systemd + `cloudflared`）
- 公网隧道：Cloudflare Tunnel `jhd-guide-home`
- 生产域名：`https://jianghaidai.com`（及 `www.jianghaidai.com`）
- 官方下载页入口：`https://app.jianghaidai.com/`（兼容 `https://jianghaidai.com/download` 301 跳转）
- 校园社区入口：`https://bbs.jianghaidai.com/`

## 环境变量（生产 `/etc/jhd-guide.env`）

- `PORT=4173`
- `HOST=127.0.0.1`
- `JHD_GUIDE_DATA_DIR=/var/lib/jhd-guide`
- `PUBLIC_BASE_URL=https://jianghaidai.com`

## 安全与编辑规则

- 严禁将 `.env`、敏感密钥或运行期 `data/` 目录提交到 Git。
- 严禁引入境外公共运行时 CDN（如 Tailwind Play CDN、`unpkg`、`placehold.co`），确保国内校园网首屏直出。
- 导航与动态文本渲染必须使用 `textContent` 或 `escapeHtml()` 转义，禁止将未转义字段直接拼接进 `innerHTML`。
- 本地验证命令：
  1. `node --test tests/guide.test.mjs`
  2. `node server/index.mjs` 并访问 `http://127.0.0.1:4173/` 检查总览、路由切换、专业校区秒查、清单勾选缓存、食堂/宿舍灯箱与勘误反馈。
