# ⚔️ 实时对战网页游戏 Demo

古风实时对战 · 最小可运行版

## 🎮 功能

- 玩家匹配、实时移动同步、攻击系统
- 服务器端地图生成、血量计算
- 前后端分离部署

## 🏗️ 架构

```
client/    → GitHub Pages（静态前端）
server/    → Render（Node.js + Socket.io 后端）
docs/      → 前端构建产物（GitHub Pages 直接使用）
```

## 🚀 快速开始（本地开发）

```bash
# 终端1 - 后端
cd server && npm install && node index.js
# → http://localhost:3001

# 终端2 - 前端
cd client && npm install && npx vite
# → http://localhost:5173
```

用两个浏览器窗口打开 http://localhost:5173 即可自相对战。

---

## 🌐 部署到云端

### 第一步：把项目上传到 GitHub

1. 打开 [github.com](https://github.com)，登录
2. 点 **New repository** → 仓库名填 `game-demo` → 选 **Public** → 点 **Create**
3. 创建后点页面上的 **uploading an existing file**
4. 把本地 `game-demo/` 文件夹里的所有内容拖进去，提交

### 第二步：部署前端到 GitHub Pages

1. 进仓库 → **Settings** → 左侧点 **Pages**
2. **Branch** 选 `main`，文件夹选 `/docs` → 点 **Save**
3. 等 1~2 分钟，GitHub 会显示 `Your site is live at https://你的用户名.github.io/game-demo/`

### 第三步：部署后端到 Render

1. 打开 [render.com](https://render.com)，用 GitHub 注册登录
2. 点 **New +** → **Web Service** → 连接你的 GitHub 仓库
3. 配置：
   - **Name**: 任意（如 `game-server`）
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
4. 点 **Create Web Service**，等 3~5 分钟
5. 拿到地址：`https://game-server-xxxx.onrender.com`（记下来！）

### 第四步：对接前后端

1. 在 GitHub 上打开 `docs/assets/index-xxxxxxxx.js` 文件
2. 搜索 `YOUR_RENDER_APP.onrender.com`
3. 点编辑，替换成你的 Render 地址
4. 提交 → GitHub Pages 会自动更新（等 1 分钟）

或者更简单：**直接改源码再重新构建上传**：

1. 编辑 `client/src/config.js`，把 `YOUR_RENDER_APP.onrender.com` 改成你的 Render 地址
2. 在项目根目录运行：`cd client && npm run build && cp -r dist ../docs`
3. 把更新后的 `docs/` 和 `client/src/config.js` 上传到 GitHub

### 第五步：测试

1. 打开 `https://你的用户名.github.io/game-demo/`
2. 用两个浏览器窗口测试对战
3. 把链接发给朋友！

---

## ⚠️ 注意事项

- Render 免费层：15 分钟无连接会休眠，下次有人访问需等 30 秒冷启动
- 此时你的 GitHub Pages 前端会一直在线
- 首次部署 Render 后，记得把 `client/src/config.js` 里的 `YOUR_RENDER_APP.onrender.com` 替换成真实地址

## 📡 Socket.io 事件通信

| 客户端 → 服务器 | 服务器 → 客户端 |
|---|---|
| `join_match` | `waiting` / `match_found` |
| `player_move` | `opponent_move` |
| `player_attack` | `attack_result` / `game_over` |
