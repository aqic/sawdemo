// ⚙️ 后端服务器地址
// 部署到 Render 后，把下面的地址改成你的 Render URL
// 格式: https://你的应用名.onrender.com
const isLocal = window.location.hostname === 'localhost'
export const SERVER_URL = isLocal
  ? 'http://localhost:3001'
  : 'https://YOUR_RENDER_APP.onrender.com'  // ← 改成你的 Render 地址
