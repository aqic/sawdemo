const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)

// 根路径友好提示
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>游戏服务器运行中</title>
      <style>
        body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .status { color: green; font-size: 24px; }
        .info { background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0; }
        code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>🎮 游戏服务器运行中</h1>
      <p class="status">✅ WebSocket 服务正常</p>
      <div class="info">
        <p><strong>服务器地址：</strong><code>${req.protocol}://${req.get('host')}</code></p>
        <p><strong>用途：</strong>仅用于 WebSocket 连接，不是游戏页面</p>
        <p><strong>游戏页面：</strong>请访问前端部署地址</p>
      </div>
      <p>💡 游戏前端会通过 WebSocket 连接到此服务器</p>
    </body>
    </html>
  `)
})

// 允许跨域（GitHub Pages 域名）
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// 健康检查端点（Render 需要）
app.get('/health', (req, res) => {
  res.json({ status: 'ok', players: waitingQueue.length, rooms: rooms.size })
})

// ===== 匹配系统 =====
const waitingQueue = []       // 等待匹配的玩家
const rooms = new Map()       // roomId -> { players: [{id, x, y}], map }

io.on('connection', (socket) => {
  console.log(`玩家连接: ${socket.id}`)

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

      console.log(`匹配成功: ${opponent.name} vs ${player.name} → ${roomId}`)
    } else {
      waitingQueue.push(player)
      socket.emit('waiting', { message: '等待对手加入...' })
      console.log(`玩家 ${player.name} 进入等待队列`)
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
    console.log(`玩家断开: ${socket.id}`)
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
  console.log(`🎮 游戏服务器启动: 端口 ${PORT}`)
})
