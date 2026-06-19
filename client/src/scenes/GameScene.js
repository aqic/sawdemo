import { io } from 'socket.io-client'
import { SERVER_URL } from '../config.js'

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
  }

  create() {
    console.log('[GameScene] create() 开始')

    // 背景色
    this.cameras.main.setBackgroundColor('#1a1a2e')

    // 先画一个可见的欢迎文字，确认 Phaser 正常工作
    this.welcomeText = this.add.text(450, 280, '正在初始化...', {
      fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5)

    // 生成纹理
    try {
      this.makeTextures()
      console.log('[GameScene] 纹理生成成功')
    } catch (e) {
      console.error('[GameScene] 纹理生成失败:', e)
      this.welcomeText.setText('纹理生成失败: ' + e.message)
      return
    }

    // 连接服务器
    try {
      this.socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true
      })
      console.log('[GameScene] Socket.io 连接中...')
    } catch (e) {
      console.error('[GameScene] Socket 连接失败:', e)
      this.welcomeText.setText('服务器连接失败: ' + e.message)
      return
    }

    this.setupUI()
    this.setupSocketEvents()

    this.cursors = this.input.keyboard.createCursorKeys()
    this.keys = {
      W: this.input.keyboard.addKey('W'),
      A: this.input.keyboard.addKey('A'),
      D: this.input.keyboard.addKey('D'),
      S: this.input.keyboard.addKey('S'),
      SPACE: this.input.keyboard.addKey('SPACE')
    }

    this.welcomeText.setText('')
    this.welcomeText.setVisible(false)
    console.log('[GameScene] create() 完成')
  }

  makeTextures() {
    // 用 add.graphics 生成纹理，最兼容的方式
    const g = this.add.graphics()

    // 蓝色玩家纹理
    g.clear()
    g.fillStyle(0x3498db, 1)
    g.fillRoundedRect(0, 0, 32, 32, 6)
    g.fillStyle(0xffffff, 0.8)
    g.fillCircle(12, 12, 4)
    g.fillCircle(22, 12, 4)
    g.generateTexture('player_blue', 32, 32)
    g.clear()

    // 红色玩家纹理
    g.fillStyle(0xe74c3c, 1)
    g.fillRoundedRect(0, 0, 32, 32, 6)
    g.fillStyle(0xffffff, 0.8)
    g.fillCircle(12, 12, 4)
    g.fillCircle(22, 12, 4)
    g.generateTexture('player_red', 32, 32)
    g.clear()

    // 障碍物纹理
    g.fillStyle(0x636e72, 1)
    g.fillRect(0, 0, 48, 48)
    g.fillStyle(0x2d3436, 1)
    g.fillRect(4, 4, 40, 40)
    g.generateTexture('obstacle', 48, 48)
    g.destroy()
  }

  setupUI() {
    const cx = 450, cy = 300
    this.uiGroup = this.add.group()

    const bg = this.add.rectangle(cx, cy, 480, 360, 0x16213e, 1)
    bg.setStrokeStyle(3, 0x0f3460)
    this.uiGroup.add(bg)

    const title = this.add.text(cx, cy - 120, '⚔️ 实时对战 Demo', {
      fontSize: '30px', color: '#e94560', fontStyle: 'bold'
    }).setOrigin(0.5)
    this.uiGroup.add(title)

    const sub = this.add.text(cx, cy - 75, '古风实时对战 · 最小可运行版', {
      fontSize: '13px', color: '#8899aa'
    }).setOrigin(0.5)
    this.uiGroup.add(sub)

    // 昵称标签
    const label = this.add.text(cx, cy - 35, '输入昵称（回车确认）', {
      fontSize: '13px', color: '#aaaaaa'
    }).setOrigin(0.5)
    this.uiGroup.add(label)

    // 创建 HTML input
    this.createInput(cx, cy)
    this.uiGroup.add(this.add.text(0, 0, '', {})) // placeholder

    // 匹配按钮
    const btn = this.add.text(cx, cy + 50, '🎮 开始匹配', {
      fontSize: '20px', color: '#ffffff',
      backgroundColor: '#0984e3',
      padding: { x: 32, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    this.uiGroup.add(btn)

    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#0771c9' }))
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#0984e3' }))
    btn.on('pointerdown', () => this.joinMatch())

    // 提示
    const tip = this.add.text(cx, cy + 110, '方向键/WASD 移动 ｜ 空格 攻击', {
      fontSize: '13px', color: '#74b9ff'
    }).setOrigin(0.5)
    this.uiGroup.add(tip)

    const tip2 = this.add.text(cx, cy + 135, '用两个浏览器窗口打开即可自相对战', {
      fontSize: '12px', color: '#555555'
    }).setOrigin(0.5)
    this.uiGroup.add(tip2)

    // 状态文字
    this.statusText = this.add.text(cx, cy + 175, '', {
      fontSize: '15px', color: '#f39c12',
      backgroundColor: '#00000088', padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setVisible(false)
    this.uiGroup.add(this.statusText)
  }

  createInput(cx, cy) {
    const old = document.getElementById('__gi')
    if (old) old.remove()

    const el = document.createElement('input')
    el.id = '__gi'
    el.type = 'text'
    el.placeholder = '输入昵称'
    el.maxLength = 8
    el.value = '玩家' + Math.floor(Math.random() * 900 + 100)
    Object.assign(el.style, {
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      marginTop: '-50px',
      width: '200px',
      height: '38px',
      fontSize: '17px',
      textAlign: 'center',
      border: '2px solid #0984e3',
      borderRadius: '10px',
      background: '#0f3460',
      color: '#dfe6e9',
      outline: 'none',
      padding: '0 12px',
      zIndex: '9999',
      fontFamily: 'monospace',
      boxSizing: 'border-box'
    })
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.joinMatch()
    })
    document.body.appendChild(el)
    setTimeout(() => el.focus(), 300)
    this._inputEl = el
  }

  removeInput() {
    if (this._inputEl) { this._inputEl.remove(); this._inputEl = null }
  }

  joinMatch() {
    const name = this._inputEl ? this._inputEl.value.trim() : ''
    this.playerName = name || ('玩家' + Math.floor(Math.random() * 900 + 100))
    this.removeInput()
    this.socket.emit('join_match', this.playerName)
    this.showStatus('⏳ 等待对手加入...')
    console.log('[GameScene] 加入匹配:', this.playerName)
  }

  setupSocketEvents() {
    this.socket.on('connect', () => {
      console.log('[Socket] 已连接', this.socket.id)
    })

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] 连接失败:', err.message)
      this.showStatus('服务器连接失败: ' + err.message, true)
    })

    this.socket.on('waiting', (data) => {
      console.log('[Socket] 等待匹配', data)
      this.showStatus('⏳ ' + data.message)
    })

    this.socket.on('match_found', (data) => {
      console.log('[Socket] 匹配成功', data)
      this.removeInput()
      this.clearUI()
      this.startGame(data)
    })

    this.socket.on('opponent_move', (data) => {
      if (this.opponent) {
        this.opponent.setPosition(data.x, data.y)
        if (data.dir) this.opponent.setFlipX(data.dir === 'left')
      }
    })

    this.socket.on('attack_result', (data) => {
      this.showAttackFX(data)
      this.updateHP(data)
    })

    this.socket.on('game_over', (data) => {
      const win = data.winnerId === this.socket.id
      this.showStatus(win ? '🎉 胜利！' : '💀 失败...', !win)
      this.isConnected = false
      this.time.delayedCall(3000, () => this.scene.restart())
    })

    this.socket.on('opponent_left', () => {
      this.showStatus('对手已离开，你赢了！', false)
      this.isConnected = false
      this.time.delayedCall(2500, () => this.scene.restart())
    })

    this.socket.on('disconnect', () => {
      console.log('[Socket] 已断开')
      this.showStatus('与服务器断开连接', true)
    })
  }

  clearUI() {
    if (this.uiGroup) this.uiGroup.setVisible(false).setActive(false)
    this.removeInput()
  }

  startGame(data) {
    console.log('[GameScene] 开始游戏', data)
    this.myData = data.players.find(p => p.id === this.socket.id)
    this.opponentData = data.players.find(p => p.id !== this.socket.id)
    this.isConnected = true

    // 地图障碍物
    if (data.map && data.map.obstacles) {
      data.map.obstacles.forEach(obs => {
        const sx = obs.x + (obs.w || 48) / 2
        const sy = obs.y + (obs.h || 48) / 2
        const s = this.physics.add.staticSprite(sx, sy, 'obstacle')
        s.setDisplaySize(obs.w || 48, obs.h || 48)
      })
    }

    // 本地玩家
    const mx = (this.myData && this.myData.x) || 200
    const my = (this.myData && this.myData.y) || 300
    this.myPlayer = this.physics.add.sprite(mx, my, 'player_blue')
    this.myPlayer.setCollideWorldBounds(true)
    this.myPlayer.body.setSize(28, 28)

    // 对手
    const ox = (this.opponentData && this.opponentData.x) || 700
    const oy = (this.opponentData && this.opponentData.y) || 300
    this.opponent = this.physics.add.sprite(ox, oy, 'player_red')
    this.opponent.setCollideWorldBounds(true)

    // 血量 UI
    const myName = this.myData ? this.myData.name : '我'
    const opName = this.opponentData ? this.opponentData.name : '对手'
    const myHp = this.myData ? this.myData.hp : 100
    const opHp = this.opponentData ? this.opponentData.hp : 100

    this.hpText = this.add.text(16, 16, `🔵 ${myName}  HP: ${myHp}`, {
      fontSize: '14px', color: '#2ecc71', fontStyle: 'bold',
      backgroundColor: '#000000aa', padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(100)

    this.opponentHpText = this.add.text(884, 16, `HP: ${opHp}  ${opName} 🔴`, {
      fontSize: '14px', color: '#e74c3c', fontStyle: 'bold',
      backgroundColor: '#000000aa', padding: { x: 8, y: 4 }
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100)

    // 名字标签
    this.myNameTag = this.add.text(mx, my - 26, myName, {
      fontSize: '11px', color: '#74b9ff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10)

    this.opNameTag = this.add.text(ox, oy - 26, opName, {
      fontSize: '11px', color: '#ff7675', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10)

    this.showStatus(`匹配成功！${myName} ⚔️ ${opName}`, false)
    this.time.delayedCall(2200, () => {
      if (this.statusText) this.statusText.setVisible(false)
    })
  }

  update(time) {
    if (!this.isConnected || !this.myPlayer) return

    const speed = 170
    let vx = 0, vy = 0, moved = false, dir = null

    if (this.cursors.left.isDown || this.keys.A.isDown)  { vx = -speed; dir = 'left';  moved = true }
    if (this.cursors.right.isDown || this.keys.D.isDown) { vx = speed;  dir = 'right'; moved = true }
    if (this.cursors.up.isDown || this.keys.W.isDown)    { vy = -speed; moved = true }
    if (this.cursors.down.isDown || this.keys.S.isDown) { vy = speed;  moved = true }

    this.myPlayer.setVelocity(vx, vy)
    if (dir !== null) this.myPlayer.setFlipX(dir === 'left')

    // 名字标签跟随
    if (this.myNameTag) this.myNameTag.setPosition(this.myPlayer.x, this.myPlayer.y - 26)
    if (this.opNameTag && this.opponent) this.opNameTag.setPosition(this.opponent.x, this.opponent.y - 26)

    // 攻击
    if (this.keys.SPACE.isDown && time - (this._lastAtk || 0) > 500) {
      this.doAttack()
      this._lastAtk = time
    }

    // 发送位置（节流）
    if (moved && time - (this._lastEmit || 0) > 50) {
      this.socket.emit('player_move', { x: this.myPlayer.x, y: this.myPlayer.y, dir })
      this._lastEmit = time
    }
  }

  doAttack() {
    if (!this.socket) return
    this.socket.emit('player_attack', { damage: 15 })
    const c = this.add.circle(this.myPlayer.x, this.myPlayer.y, 22, 0xf1c40f, 0.7).setDepth(5)
    this.tweens.add({ targets: c, alpha: 0, scale: 2.5, duration: 300, onComplete: () => c.destroy() })
    this.myPlayer.setTint(0xffffff)
    this.time.delayedCall(100, () => this.myPlayer.clearTint())
  }

  showAttackFX(data) {
    const tgt = data.defenderId === this.socket.id ? this.myPlayer : this.opponent
    if (!tgt) return
    const c = this.add.circle(tgt.x, tgt.y, 20, 0xe74c3c, 0.7).setDepth(5)
    this.tweens.add({ targets: c, alpha: 0, scale: 2.5, duration: 350, onComplete: () => c.destroy() })
    tgt.setTint(0xff0000)
    this.time.delayedCall(120, () => tgt.clearTint())
  }

  updateHP(data) {
    if (!this.myData || !this.opponentData) return
    if (data.defenderId === this.myData.id) {
      this.myData.hp = data.defenderHp
      if (this.hpText) this.hpText.setText(`🔵 ${this.myData.name}  HP: ${Math.max(0, data.defenderHp)}`)
    }
    if (data.defenderId === this.opponentData.id) {
      this.opponentData.hp = data.defenderHp
      if (this.opponentHpText) this.opponentHpText.setText(`HP: ${Math.max(0, data.defenderHp)}  ${this.opponentData.name} 🔴`)
    }
  }

  showStatus(msg, isError) {
    if (!this.statusText) return
    this.statusText.setText(msg)
    this.statusText.setColor(isError ? '#e74c3c' : '#2ecc71')
    this.statusText.setVisible(true)
  }
}
