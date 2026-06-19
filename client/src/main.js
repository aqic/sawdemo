import Phaser from 'phaser'
import GameScene from './scenes/GameScene.js'

const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 600,
  parent: 'app',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [GameScene],
  render: {
    antialias: true
  }
}

try {
  const game = new Phaser.Game(config)
  console.log('Phaser 游戏实例已创建', game)
} catch (e) {
  console.error('Phaser 初始化失败:', e)
  document.getElementById('app').innerHTML =
    '<div style="color:red;padding:40px;font-size:18px">' +
    '游戏初始化失败: ' + e.message + '<br><br>' +
    '请打开 F12 控制台查看详细错误' +
    '</div>'
}
