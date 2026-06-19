# 🎮 实时对战游戏 Demo

古风实时对战网页游戏 - 最小可运行版本

## 🚀 快速部署指南

### 📦 前端部署（游戏页面）

#### 方案 A：Vercel（推荐，免费）

1. 访问 [vercel.com](https://vercel.com) 注册（可用 GitHub 登录）
2. 点 **Add New...** → **Project**
3. 导入你的 GitHub 仓库 `game-demo`
4. 配置：
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 点 **Deploy**
6. 等待 1-2 分钟，获得前端地址：
   ```
   https://game-demo-xxx.vercel.app
   ```

#### 方案 B：GitHub Pages（需公开仓库）

1. 在 GitHub 仓库设置中启用 Pages
2. Source 选择 `main` 分支 + `/docs` 目录
3. 访问：`https://你的用户名.github.io/game-demo/`

---

### 🔌 后端部署（WebSocket 服务器）

#### Render（免费）

1. 访问 [render.com](https://render.com) 注册
2. 点 **New +** → **Web Service**
3. 连接 GitHub 仓库 `game-demo`
4. 配置：
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: Free
5. 点 **Create Web Service**
6. 获得后端地址：
   ```
   https://game-demo-xxx.onrender.com
   ```

#### ⚙️ 重要：更新前端配置

部署后端后，需要更新前端配置：

1. 编辑 `client/src/config.js`
2. 把第 7 行改成你的 Render 地址：
   ```javascript
   : 'https://你的后端地址.onrender.com'
   ```
3. 重新构建前端：`cd client && npm run build`
4. 把新生成的 `docs/` 目录推送到 GitHub

---

## 🧪 本地测试

### 启动后端
```bash
cd server
node index.js
```

### 启动前端
```bash
cd client
npm install
npm run dev
```

### 测试游戏
1. 打开 `http://localhost:5173/`
2. 输入昵称，点"开始匹配"
3. 打开另一个浏览器窗口（或手机）
4. 也访问 `http://localhost:5173/`
5. 输入不同昵称，点"开始匹配"
6. 两个玩家会自动匹配并开始对战！

---

## 🎯 游戏操作

| 操作 | 按键 |
|------|------|
| 移动 | 方向键 或 WASD |
| 攻击 | 空格键 |

---

## 📁 项目结构

```
game-demo/
├── client/          # 前端源码（Phaser + Vite）
│   ├── src/
│   │   ├── config.js      # 后端服务器地址配置
│   │   ├── main.js        # 游戏入口
│   │   └── scenes/
│   │       └── GameScene.js  # 游戏主场景
│   ├── vite.config.js
│   └── package.json
├── server/          # 后端源码（Node.js + Socket.io）
│   ├── index.js      # 服务器主文件
│   └── package.json
├── docs/            # 前端构建产物（GitHub Pages 用）
├── render.yaml       # Render 部署配置
├── vercel.json      # Vercel 部署配置
└── README.md
```

---

## 🔧 常见问题

### Q: 前端显示"服务器连接失败"？
**A**: 检查后端是否正常运行，以及 `client/src/config.js` 中的地址是否正确。

### Q: Render 后端休眠后第一次访问很慢？
**A**: 免费层 15 分钟没人访问会休眠，唤醒需等待 30-60 秒，这是正常的。

### Q: 两个玩家无法匹配？
**A**: 确保两个玩家访问的是同一个前端地址，且后端正常运行。

### Q: 游戏画面看不到或出现错乱？
**A**: 按 F12 打开控制台，查看是否有红色错误信息，把错误信息发给我。

---

## 📧 联系支持

如果遇到问题，请提供：
1. 浏览器控制台的红色错误信息（按 F12 查看）
2. Render 控制台的日志
3. 具体的操作步骤和现象

---

**祝你游戏开发顺利！🎮**
