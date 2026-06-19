const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)

// 根路径 - 友好提示页面
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>游戏服务器运行中</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; 
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 40px;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    h1 { 
      color: #e94560; 
      font-size: 32px; 
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .status { 
      color: #2ecc71; 
      font-size: 20px; 
      margin: 20px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info { 
      background: rgba(255,255,255,0.05); 
      border-left: 4px solid #0984e3; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 24px 0;
    }
    .info p { 
      color: #bdc3c7; 
      margin: 12px 0;
      line-height: 1.6;
    }
    .info strong { 
      color: #ecf0f1; 
    }
    code { 
      background: rgba(9,132,227,0.2); 
      color: #74b9ff; 
      padding: 3px 8px; 
      border-radius: 4px; 
      font-size: 14px;
    }
    .footer { 
      color: #636e72; 
      font-size: 14px; 
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .pulse {
      display: inline-block;
      width: 12px;
      height: 12px;
      background: #2ecc71;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎮 游戏服务器运行中</h1>
    <div class="status">
      <span class="pulse"></span>
      <span>WebSocket 服务正常运行</span>
    </div>
    <div class="info">
      <p><strong>📡 服务器地址：</strong></p>
      <p style="text-align: center; margin: 12px 0;">
        <code>${req.protocol}://${req.get('host')}</code>
      </p>
      <p><strong>🎯 用途：</strong>此地址仅用于 WebSocket 实时通信连接</p>
      <p><strong>🎮 游戏页面：</strong>请访问前端部署地址（玩家在这里玩游戏）</p>
    </div>
    <div class="footer">
      💡 游戏前端会通过 WebSocket 协议自动连接到此服务器<br>
      ⚡ 实时对战延迟 &lt; 50ms
    </div>
  </div>
</body>
</html>
  `)
})

// 健康检查端点（Render 需要）
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    players: waitingQueue.length, 
    rooms: rooms.size,
    uptime: process.uptime()
  })
})

// 允许跨域（支持所有来源）
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
})

// ===== 匹配系统 =====
const waitingQueue = []       // 等待匹配的玩家
const rooms = new Map()       // roomId -> { players: [{id, x, y}], map }

io.on('connection', (socket) => {
  console.log(`[连接] 玩家接入: ${socket.id}`)

  // —— 加入匹配队列 ——
  socket.on('join_match', (playerName) => {
    const player = {
      id: socket.id,
      name: playerName || `玩家${Math.floor(Math.random() * 1000)}`,
      x: 400,
      y: 300,
      hp: 100,
      ready: false
    }

    if (waitingQueue.length > 0) {
      const opponent = waitingQueue.shift()
      const roomId = `room_${Date.now()}`

      const map = generateMap()

      const room = {
        id: roomId,
        players: [opponent, player],
        map,
        status: 'playing'
      }
      rooms.set(roomId, room)

      socket.join(roomId)
      const opponentSocket = io.sockets.sockets.get(opponent.id)
      if (opponentSocket) opponentSocket.join(roomId)

      io.to(roomId).emit('match_found', {
        roomId,
        players: room.players,
        map: room.map
      })

      console.log(`[匹配] ${opponent.name} vs ${player.name} → ${roomId}`)
    } else {
      waitingQueue.push(player)
      socket.emit('waiting', { message: '等待对手加入...' })
      console.log(`[等待] 玩家 ${player.name} 进入队列`)
    }
  })

  // —— 玩家移动 ——
  socket.on('player_move', (data) => {
    for (const [roomId, room] of rooms) {
      const player = room.players.find(p => p.id === socket.id)
      if (player) {
        player.x = data.x
        player.y = data.y
        player.dir = data.dir
        socket.to(roomId).emit('opponent_move', {
          id: socket.id,
          x: data.x,
          y: data.y,
          dir: data.dir
        })
        break
      }
    }
  })

  // —— 玩家攻击 ——
  socket.on('player_attack', (data) => {
    for (const [roomId, room] of rooms) {
      const attacker = room.players.find(p => p.id === socket.id)
      if (attacker) {
        const defenders = room.players.filter(p => p.id !== socket.id)
        defenders.forEach(defender => {
          if (defender.hp > 0) {
            defender.hp -= data.damage || 10
            io.to(roomId).emit('attack_result', {
              attackerId: socket.id,
              defenderId: defender.id,
              defenderHp: Math.max(0, defender.hp)
            })
            if (defender.hp <= 0) {
              io.to(roomId).emit('game_over', {
                winnerId: socket.id,
                reason: '击杀'
              })
              room.status = 'ended'
            }
          }
        })
        break
      }
    }
  })

  // —— 断开连接 ——
  socket.on('disconnect', () => {
    console.log(`[断开] 玩家离开: ${socket.id}`)
    const idx = waitingQueue.findIndex(p => p.id === socket.id)
    if (idx !== -1) waitingQueue.splice(idx, 1)

    for (const [roomId, room] of rooms) {
      const playerIdx = room.players.findIndex(p => p.id === socket.id)
      if (playerIdx !== -1) {
        room.players.splice(playerIdx, 1)
        socket.to(roomId).emit('opponent_left', { message: '对手已断开连接' })
        if (room.players.length === 0) rooms.delete(roomId)
        break
      }
    }
  })
})

// ===== 地图生成 =====
function generateMap() {
  const obstacles = []
  const count = 8 + Math.floor(Math.random() * 5)
  for (let i = 0; i < count; i++) {
    obstacles.push({
      x: 100 + Math.random() * 700,
      y: 100 + Math.random() * 500,
      w: 40 + Math.random() * 60,
      h: 40 + Math.random() * 60
    })
  }
  return { width: 900, height: 600, obstacles }
}

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`🎮 游戏服务器启动成功`)
  console.log(`📡 监听端口: ${PORT}`)
  console.log(`🌐 环境变量 PORT: ${process.env.PORT || '(未设置，使用默认 3001)'}`)
})
