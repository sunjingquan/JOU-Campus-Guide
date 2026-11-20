# JOU Campus Guide Agent 说明

## 项目概况

- 江苏海洋大学校园指南全栈轻量站点（原生 ES Module 前端 + Node.js 内置 `node:sqlite` 后端）。
- 应用前端入口：`index.html`，组件位于 `components/`、`js/`、`services/`。
- 服务端入口：`server/index.mjs`（零外部 npm 依赖，要求 Node.js 22.5+）。
- 数据初始化脚本：`server/seed-from-cloudbase.mjs`（将数据与图片导入运行目录 `data/`）。

## 生产运行架构

- GitHub 仓库：`sunjingquan/JOU-Campus-Guide`
- 承载环境：家庭服务器 PVE `CT 105 (jhd-guide)`（Debian 12，Nginx + Node systemd + `cloudflared`）
- 公网隧道：Cloudflare Tunnel `jhd-guide-home`
- 生产域名：`https://jianghaidai.com`（及 `www.jianghaidai.com`）
- 官方下载页入口：`https://app.jianghaidai.com/`（兼容 `https://jianghaidai.com/download` 301 跳转）
- 统一身份认证：对接 `https://bbs.jianghaidai.com` 原生 **DiscourseConnect Provider** 单点登录；社区管理员自动映射指南管理写权限。

## 环境变量（生产 `/etc/jhd-guide.env`）

- `PORT=4173`
- `HOST=127.0.0.1`
- `JHD_GUIDE_DATA_DIR=/var/lib/jhd-guide`
- `PUBLIC_BASE_URL=https://jianghaidai.com`
- `DISCOURSE_BASE_URL=https://bbs.jianghaidai.com`
- `DISCOURSE_CONNECT_SECRET=<与论坛 SiteSetting.discourse_connect_provider_secrets 一致的随机密钥>`
- `SESSION_SECRET=<独立 32 字节随机十六进制密钥>`

## 安全与编辑规则

- 严禁将 `.env`、`SESSION_SECRET`、`DISCOURSE_CONNECT_SECRET` 或运行期 `data/` 目录提交到 Git。
- 导航与动态文本渲染必须使用 `textContent` 或转义，禁止将数据库字段直接拼接进 `innerHTML`。
- 本地验证命令：
  1. `node server/index.mjs`
  2. 访问 `http://127.0.0.1:4173/` 检查首页、校区切换、食堂/宿舍图片、搜索、资料列表与反馈提交。
