# JOU Campus Guide Agent 说明

## 项目概况

- 这是江苏海洋大学校园指南的静态前端网站。
- 应用入口是 `index.html`。
- 主要代码位于 `components/`、`js/` 和 `services/`。
- CloudBase 初始化逻辑在 `js/cloudbase.js`。
- CloudBase 数据访问统一封装在 `services/api.js`。
- 当前仓库没有包管理器配置，也没有本地构建步骤。

## 运行服务

- GitHub 仓库：`sunjingquan/JOU-Campus-Guide`
- Netlify 站点名：`majestic-cuchufli-106b9c`
- Netlify Site ID：`6c7839cf-ca15-43f8-93d1-b60167f2ff72`
- 生产域名：`https://jianghaidai.com`
- 生产 DNS 所在 Cloudflare Zone：`jianghaidai.com`
- CloudBase 环境 ID：`jou-campus-guide-9f57jf08ece0812`
- CloudBase 环境别名：`jou-campus-guide`
- CloudBase 区域：`ap-shanghai`

## CloudBase

- 当前前端通过 CloudBase Web SDK 直连后端，`js/cloudbase.js` 中的环境 ID 属于公开客户端配置，不是 Secret。
- 本项目本地测试通常不需要额外配置环境变量；只要浏览器能访问 CloudBase SDK CDN、CloudBase 环境允许当前来源访问、数据库权限规则允许相应读写，就能读取后端数据。
- 不要把 Secret ID、Secret Key、临时凭据或管理端 Token 放到前端代码、Netlify 环境变量或仓库文件中。前端安全边界依赖 CloudBase 登录态、数据库权限规则、存储权限和应用侧配置。
- 如果本地页面一直停在“正在加载”，优先检查：
  1. 是否通过本地静态服务访问页面，而不是直接 `file://` 打开。
  2. 浏览器是否能加载 `https://static.cloudbase.net/cloudbase-js-sdk/2.18.0/cloudbase.full.js`。
  3. CloudBase 应用侧是否允许当前来源（如 `http://localhost:4173`）访问。
  4. `guide_data` 和 `campus_data` 的读取权限与集合数据是否正常。
- 管理 CloudBase 时优先使用 CloudBase MCP。不要硬编码 Secret ID、Secret Key 或临时凭据。
- 操作 CloudBase 前，先确认 MCP 和登录状态：

```bash
npx mcporter list
npx mcporter describe cloudbase --all-parameters
npx mcporter call 'cloudbase.auth(action: "status")'
```

- 如果没有登录，使用 Web 授权方式：

```bash
npx mcporter call 'cloudbase.auth(action: "start_auth", authMode: "web")'
```

- 项目主要使用这些 NoSQL 集合：
  - `guide_data`
  - `campus_data`
  - `study_materials`
  - `ratings`
  - `feedback`
  - `users`
- 将 `users`、`feedback`、`sys_user` 等账号、用户、反馈相关集合视为敏感集合。除非用户明确要求，否则不要读取这些集合的记录内容。
- 优先使用只读工具：
  - `envQuery`
  - `readNoSqlDatabaseStructure`
  - `readNoSqlDatabaseContent`
  - `queryFunctions`
  - `queryApps`
  - `queryPermissions`
- 使用任何写入工具前，必须说明准确目标并征得用户确认：
  - `writeNoSqlDatabaseStructure`
  - `writeNoSqlDatabaseContent`
  - `manageFunctions`
  - `manageApps`
  - `managePermissions`
  - `envDomainManagement`

## Netlify

- 当前使用 Git 驱动部署。推送到生产分支后，Netlify 会自动更新生产站点。
- 当前站点是无构建静态发布；`netlify.toml` 应保持 `publish = "."`，不需要 `npm install`、`npm run build` 或 Node 构建步骤。
- 正式上线常规流程：
  1. 本地检查 `git status --short`，确认没有 `.DS_Store`、凭据或临时文件进入提交。
  2. 用本地静态服务验证：`python3 -m http.server 4173`，访问 `http://localhost:4173/`。
  3. 验证首页加载、导航、搜索、深色模式、学习资料、登录入口、反馈入口等关键 UI。
  4. 确认 CloudBase 核心集合可读，敏感集合不随意读取记录内容。
  5. 提交并推送到生产分支，等待 Netlify 自动部署。
  6. 部署完成后访问 `https://jianghaidai.com` 做生产冒烟验证。
- 检查站点信息时，优先使用 Netlify 插件工具或 Netlify CLI。
- 未经用户明确确认，不要部署站点、重命名项目、修改访问控制或修改环境变量。
- 环境变量可能包含公开客户端配置，也可能包含敏感值。总结时不要输出完整变量值，除非用户明确要求。

## Cloudflare

- Cloudflare 负责生产域名 DNS。
- `jianghaidai.com` 和 `www.jianghaidai.com` 指向 Netlify 站点。
- Cloudflare MCP 可能具备 DNS 写权限。所有 DNS 写操作都视为高风险操作：
  - 未经明确确认，绝不创建、更新或删除 DNS 记录。
  - 修改前必须说明 Zone、记录名、记录类型、旧值、新值、TTL 和代理状态。

## 编辑规则

- 改动保持小而清晰，遵循当前静态 JavaScript 项目的写法。
- 除非用户明确要求，否则不要引入构建系统。
- 不要提交 `.DS_Store`。
- 不要提交凭据、Token、导出的环境变量文件或 CloudBase 临时凭据。
- 遵守现有模块边界：
  - UI 组件放在 `components/`
  - CloudBase 共享初始化放在 `js/cloudbase.js`
  - CloudBase 数据操作放在 `services/api.js`

## 验证方式

- 因为项目使用 ES Module，推荐通过本地静态服务验证，不推荐直接用 `file://` 打开 `index.html`。
- 推荐本地命令：`python3 -m http.server 4173`，然后访问 `http://localhost:4173/`。
- 涉及服务端或云服务配置的改动，按以下顺序验证：
  1. 检查代码路径和 CloudBase 集合、函数名称。
  2. 使用 CloudBase、Netlify、Cloudflare 的只读检查。
  3. 如果改动影响 UI 行为，进行本地浏览器验证。
  4. 任何远端写入、部署、DNS 修改、数据库修改或权限修改之前，都要先询问用户。
