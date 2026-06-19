import { io } from 'socket.io-client'
import { SERVER_URL } from '../config.js'

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
  }

  create() {
    // 获取实际画布尺寸（动态适配）
    this.W = this.cameras.main.width   // 900
    this.H = this.cameras.main.height  // 600
    this.cx = this.W / 2
    this.cy = this.H / 2

    console.log('[Game] 画布尺寸:', this.W, 'x', this.H)

    // 背景色
    this.cameras.main.setBackgroundColor('#1a1a2e')

    // 第一步：生成纹理
    try {
      this.makeTextures()
      console.log('[Game] 纹理生成成功')
    } catch (e) {
      console.error('[Game] 纹理生成失败:', e)
      this.showError('纹理生成失败')
      return
    }

    // 第二步：画 UI 界面（在连接服务器之前就画出来）
    this.drawUI()

    // 第三步：连接服务器
    try {
      this.socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        timeout: 10000
      })
      console.log('[Game] 正在连接:', SERVER_URL)
    } catch (e) {
      console.error('[Game] Socket 创建失败:', e)
      this.updateStatus('❌ 无法连接服务器', '#e74c3c')
      return
    }

    this.setupSocketEvents()

    // 键盘输入
    this.cursors = this.input.keyboard.createCursorKeys()
    this.keys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    }

    console.log('[Game] 初始化完成')
  }

  // ====== 纹理生成 ======
  makeTextures() {
    const g = this.add.graphics()

    // 蓝色玩家（大一点，更明显）
    g.clear()
    g.fillStyle(0x3498db, 1)
    g.fillRoundedRect(0, 0, 36, 36, 8)
    g.fillStyle(0xffffff, 0.9)
    g.fillCircle(13, 14, 5)
    g.fillCircle(24, 14, 5)
    g.lineStyle(2, 0x2980b9, 1)
    g.strokeRoundedRect(0, 0, 36, 36, 8)
    g.generateTexture('player_blue', 36, 36)
    g.clear()

    // 红色玩家
    g.clear()
    g.fillStyle(0xe74c3c, 1)
    g.fillRoundedRect(0, 0, 36, 36, 8)
    g.fillStyle(0xffffff, 0.9)
    g.fillCircle(13, 14, 5)
    g.fillCircle(24, 14, 5)
    g.lineStyle(2, 0xc0392b, 1)
    g.strokeRoundedRect(0, 0, 36, 36, 8)
    g.generateTexture('player_red', 36, 36)
    g.clear()

    // 障碍物
    g.clear()
    g.fillStyle(0x636e72, 1)
    g.fillRoundedRect(0, 0, 48, 48, 4)
    g.fillStyle(0x4a5568, 1)
    g.fillRoundedRect(4, 4, 40, 40, 3)
    g.generateTexture('obstacle', 48, 48)
    g.destroy()
  }

  // ====== UI 绘制 ======
  drawUI() {
    const cx = this.cx
    const cy = this.cy

    // 半透明背景面板
    const panelBg = this.add.rectangle(cx, cy, 420, 340, 0x16213e, 0.95)
    panelBg.setStrokeStyle(2, 0x0f3460)
    panelBg.setDepth(10)

    // 标题
    this.add.text(cx, cy - 130, '⚔️ 实时对战 Demo', {
      fontSize: '28px', color: '#e94560', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(11)

    // 副标题
    this.add.text(cx, cy - 90, '古风实时对战 · 最小可运行版', {
      fontSize: '14px', color: '#8899aa'
    }).setOrigin(0.5).setDepth(11)

    // 昵称提示
    this.add.text(cx, cy - 50, '输入昵称后点按钮开始匹配', {
      fontSize: '14px', color: '#aaaaaa'
    }).setOrigin(0.5).setDepth(11)

    // 昵称输入框（用 Phaser 的文本模拟，不用 DOM）
    this.nicknameText = this.add.text(cx, cy - 15, '', {
      fontSize: '20px', color: '#ffffff',
      backgroundColor: '#0f3460',
      padding: { x: 16, y: 8 },
      border: '2px solid #0984e3',
      borderRadius: '8px'
    }).setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true })

    // 默认昵称
    this.currentNickname = '玩家' + Math.floor(Math.random() * 900 + 100)
    this.nicknameText.setText(this.currentNickname)

    // 点击输入框可以输入文字（用键盘输入模拟）
    this.isEditingNick = false
    this.nicknameText.on('pointerdown', () => {
      this.isEditingNick = true
      this.nicknameText.setStyle({ border: '2px solid #f39c12' })
      window.__gameInputActive = true
    })

    // 匹配按钮
    const btn = this.add.text(cx, cy + 50, '🎮  开始匹配', {
      fontSize: '22px', color: '#ffffff',
      backgroundColor: '#0984e3',
      padding: { x: 30, y: 12 },
      borderRadius: '8px'
    }).setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true })

    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#0771c9' }))
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#0984e3' }))
    btn.on('pointerdown', () => this.joinMatch())

    // 操作提示
    this.add.text(cx, cy + 105, '方向键 / WASD 移动   |   空格 攻击', {
      fontSize: '13px', color: '#74b9ff'
    }).setOrigin(0.5).setDepth(11)

    this.add.text(cx, cy + 128, '用两个浏览器窗口打开即可自相对战', {
      fontSize: '12px', color: '#666666'
    }).setOrigin(0.5).setDepth(11)

    // 状态栏
    this.statusText = this.add.text(cx, cy + 165, '正在连接服务器...', {
      fontSize: '15px', color: '#f39c12'
    }).setOrigin(0.5).setDepth(13)

    // 保存引用，方便后续隐藏/销毁
    this.uiElements = [panelBg, this.statusText]
  }

  // ====== 键盘输入处理（用于昵称编辑） ======
  handleNicknameInput(event) {
    if (!this.isConnected && this.isEditingNick) {
      const key = event.key
      if (key === 'Enter') {
        this.isEditingNick = false
        this.nicknameText.setStyle({ border: '2px solid #0984e3' })
        window.__gameInputActive = false
        this.joinMatch()
      } else if (key === 'Backspace') {
        this.currentNickname = this.currentNickname.slice(0, -1)
        this.nicknameText.setText(this.currentNickname || '|')
      } else if (key.length === 1 && this.currentNickname.length < 8) {
        this.currentNickname += key
        this.nicknameText.setText(this.currentNickname)
      }
    }
  }

  // ====== 加入匹配 ======
  joinMatch() {
    const name = this.currentNickname.trim()
    this.playerName = name || ('玩家' + Math.floor(Math.random() * 900 + 100))
    window.__gameInputActive = false
    this.socket.emit('join_match', this.playerName)
    this.updateStatus('⏳ 正在匹配对手...', '#f39c12')
    console.log('[Game] 发起匹配:', this.playerName)
  }

  // ====== Socket 事件 ======
  setupSocketEvents() {
    this.socket.on('connect', () => {
      console.log('[Socket] ✅ 已连接', this.socket.id)
      this.updateStatus('✅ 已连接到服务器 — 输入昵称开始匹配', '#2ecc71')
    })

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] ❌ 连接失败:', err.message)
      this.updateStatus('❌ 服务器连接失败: ' + err.message, '#e74c3c')
    })

    this.socket.on('waiting', (data) => {
      console.log('[Socket] ⏳ 等待中')
      this.updateStatus('⏳ 等待对手加入...', '#f39c12')
    })

    this.socket.on('match_found', (data) => {
      console.log('[Socket] 🎯 匹配成功!', data)
      this.hideUI()
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
      this.showEndOverlay(win ? '🎉 你赢了！' : '💀 你输了...', !win)
      this.gameOver = true
    })

    this.socket.on('opponent_left', () => {
      this.showEndOverlay('🏆 对手离开了！你赢了！', false)
      this.gameOver = true
    })

    this.socket.on('disconnect', () => {
      console.log('[Socket] 断开连接')
      if (!this.gameOver) {
        this.showEndOverlay('🔌 与服务器断开连接', true)
      }
    })
  }

  hideUI() {
    // 隐藏所有 UI 元素
    this.children.each((child) => {
      if (child.depth >= 10 && child !== this.hpText &&
          child !== this.opponentHpText &&
          child !== this.myNameTag && child !== this.opNameTag) {
        child.setVisible(false)
      }
    })
  }

  // ====== 开始游戏 ======
  startGame(data) {
    this.myData = data.players.find(p => p.id === this.socket.id)
    this.opponentData = data.players.find(p => p.id !== this.socket.id)
    this.isConnected = true
    this.gameOver = false

    // 地图边界
    this.physics.world.setBounds(0, 0, data.map.width || 900, data.map.height || 600)

    // 障碍物
    if (data.map && data.map.obstacles) {
      data.map.obstacles.forEach(obs => {
        const sx = obs.x + (obs.w || 48) / 2
        const sy = obs.y + (obs.h || 48) / 2
        const s = this.physics.add.staticSprite(sx, sy, 'obstacle')
        s.setDisplaySize(obs.w || 48, obs.h || 48)
        s.setDepth(1)
      })
    }

    // 本地玩家
    const mx = (this.myData && this.myData.x) || 200
    const my = (this.myData && this.myData.y) || 300
    this.myPlayer = this.physics.add.sprite(mx, my, 'player_blue')
    this.myPlayer.setCollideWorldBounds(true)
    this.myPlayer.body.setSize(30, 30)
    this.myPlayer.setDepth(5)

    // 对手
    const ox = (this.opponentData && this.opponentData.x) || 700
    const oy = (this.opponentData && this.opponentData.y) || 300
    this.opponent = this.physics.add.sprite(ox, oy, 'player_red')
    this.opponent.setCollideWorldBounds(true)
    this.opponent.setDepth(5)

    // 血量信息
    const myName = this.myData ? this.myData.name : '我'
    const opName = this.opponentData ? this.opponentData.name : '对手'

    this.hpText = this.add.text(16, 14, `🔵 ${myName}  ❤️❤️❤️❤️❤️`, {
      fontSize: '15px', color: '#2ecc71', fontStyle: 'bold',
      backgroundColor: '#000000cc', padding: { x: 10, y: 6 },
      borderRadius: '6px'
    }).setScrollFactor(0).setDepth(100)

    this.opponentHpText = this.add.text(this.W - 16, 14, `❤️❤️❤️❤️❤️  ${opName} 🔴`, {
      fontSize: '15px', color: '#e74c3c', fontStyle: 'bold',
      backgroundColor: '#000000cc', padding: { x: 10, y: 6 },
      borderRadius: '6px'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100)

    // 名字标签
    this.myNameTag = this.add.text(mx, my - 28, myName, {
      fontSize: '12px', color: '#74b9ff', fontStyle: 'bold',
      backgroundColor: '#00000088', padding: { x: 4, y: 1 }
    }).setOrigin(0.5).setDepth(10)

    this.opNameTag = this.add.text(ox, oy - 28, opName, {
      fontSize: '12px', color: '#ff7675', fontStyle: 'bold',
      backgroundColor: '#00000088', padding: { x: 4, y: 1 }
    }).setOrigin(0.5).setDepth(10)

    // 显示匹配成功消息
    this.showMatchBanner(`${myName}  ⚔️  ${opName}`)
  }

  showMatchBanner(msg) {
    const banner = this.add.rectangle(this.cx, this.cy, 400, 60, 0x000000, 0.85)
    banner.setDepth(90)
    const txt = this.add.text(this.cx, this.cy, `🎯 ${msg}`, {
      fontSize: '22px', color: '#f1c40f', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(91)
    this.tweens.add({
      targets: [banner, txt], alpha: 0, delay: 2000, duration: 500,
      onComplete: () => { banner.destroy(); txt.destroy() }
    })
  }

  showEndOverlay(msg, isError) {
    const overlay = this.add.rectangle(this.cx, this.cy, this.W, this.H, 0x000000, 0.7)
    overlay.setDepth(95)
    const txt = this.add.text(this.cx, this.cy, msg, {
      fontSize: isError ? '32px' : '36px',
      color: isError ? '#e74c3c' : '#f1c40f',
      fontStyle: 'bold',
      backgroundColor: '#16213e',
      padding: { x: 30, y: 20 },
      borderRadius: '12px'
    }).setOrigin(0.5).setDepth(96)

    // 重试按钮
    const retryBtn = this.add.text(this.cx, this.cy + 70, '🔄 重新开始', {
      fontSize: '18px', color: '#fff', backgroundColor: '#0984e3',
      padding: { x: 24, y: 10 }, borderRadius: '8px'
    }).setOrigin(0.5).setDepth(97).setInteractive({ useHandCursor: true })

    retryBtn.on('pointerdown', () => this.scene.restart())
    retryBtn.on('pointerover', () => retryBtn.setStyle({ backgroundColor: '#0771c9' }))
    retryBtn.on('pointerout', () => retryBtn.setStyle({ backgroundColor: '#0984e3' }))
  }

  // ====== 游戏循环 ======
  update(time) {
    // 处理昵称键盘输入
    if (!this.isConnected) {
      // 在游戏循环中不需要额外处理
    }

    if (!this.isConnected || !this.myPlayer || this.gameOver) return

    const speed = 180
    let vx = 0, vy = 0, moved = false, dir = null

    if (this.cursors.left.isDown || this.keys.A.isDown)  { vx = -speed; dir = 'left';  moved = true }
    if (this.cursors.right.isDown || this.keys.D.isDown) { vx = speed;  dir = 'right'; moved = true }
    if (this.cursors.up.isDown || this.keys.W.isDown)    { vy = -speed; moved = true }
    if (this.cursors.down.isDown || this.keys.S.isDown)   { vy = speed;  moved = true }

    this.myPlayer.setVelocity(vx, vy)
    if (dir !== null) this.myPlayer.setFlipX(dir === 'left')

    // 名字标签跟随
    if (this.myNameTag) this.myNameTag.setPosition(this.myPlayer.x, this.myPlayer.y - 28)
    if (this.opNameTag && this.opponent) this.opNameTag.setPosition(this.opponent.x, this.opponent.y - 28)

    // 攻击（CD 500ms）
    if (this.keys.SPACE.justDown || (this.keys.SPACE.isDown && time - (this._lastAtk || 0) > 500)) {
      this.doAttack()
      this._lastAtk = time
    }

    // 位置同步（节流 50ms）
    if (moved && time - (this._lastEmit || 0) > 50) {
      this.socket.emit('player_move', {
        x: Math.round(this.myPlayer.x),
        y: Math.round(this.myPlayer.y),
        dir
      })
      this._lastEmit = time
    }
  }

  doAttack() {
    if (!this.socket) return
    this.socket.emit('player_attack', { damage: 15 })

    // 攻击特效
    const c = this.add.circle(this.myPlayer.x, this.myPlayer.y, 26, 0xf1c40f, 0.75).setDepth(6)
    this.tweens.add({
      targets: c, alpha: 0, scale: 2.8, duration: 320,
      onComplete: () => c.destroy()
    })

    // 角色闪白
    this.myPlayer.setTint(0xffffff)
    this.time.delayedCall(80, () => {
      if (this.myPlayer) this.myPlayer.clearTint()
    })
  }

  showAttackFX(data) {
    const tgt = data.defenderId === this.socket.id ? this.myPlayer : this.opponent
    if (!tgt) return

    const c = this.add.circle(tgt.x, tgt.y, 24, 0xe74c3c, 0.7).setDepth(6)
    this.tweens.add({
      targets: c, alpha: 0, scale: 2.5, duration: 350,
      onComplete: () => c.destroy()
    })

    tgt.setTint(0xff0000)
    this.time.delayedCall(120, () => { if (tgt) tgt.clearTint() })
  }

  updateHP(data) {
    if (!this.myData || !this.opponentData) return

    const hearts = n => '❤️'.repeat(Math.ceil(n / 20)) + '🖤'.repeat(Math.max(0, 5 - Math.ceil(n / 20)))

    if (data.defenderId === this.myData.id) {
      this.myData.hp = data.defenderHp
      if (this.hpText) this.hpText.setText(`🔵 ${this.myData.name}  ${hearts(data.defenderHp)}`)
    }
    if (data.defenderId === this.opponentData.id) {
      this.opponentData.hp = data.defenderHp
      if (this.opponentHpText) this.opponentHpText.setText(`${hearts(data.defenderHp)}  ${this.opponentData.name} 🔴`)
    }
  }

  updateStatus(text, color) {
    if (this.statusText) {
      this.statusText.setText(text)
      if (color) this.statusText.setColor(color)
    }
  }

  showError(msg) {
    const cx = this.cx, cy = this.cy
    this.add.rectangle(cx, cy, 500, 120, 0x1a1a2e, 0.98)
    this.add.text(cx, cy - 20, '❌ 出错了', {
      fontSize: '24px', color: '#e74c3c', fontStyle: 'bold'
    }).setOrigin(0.5)
    this.add.text(cx, cy + 25, msg, {
      fontSize: '16px', color: '#cccccc'
    }).setOrigin(0.5)
  }
}
