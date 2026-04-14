<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import 'pixi.js/unsafe-eval'
import * as PIXI from 'pixi.js'

const appRef = ref<HTMLDivElement>();
let app: PIXI.Application | null = null
let player: PIXI.Graphics | null = null
let targetX = 0
let targetY = 0
const playerSpeed = 5

onMounted(async () => {
  if (!appRef.value) return

  app = new PIXI.Application()
  await app.init({
    width: appRef.value.clientWidth,
    height: appRef.value.clientHeight,
    backgroundColor: 0x1099bb,
    antialias: true
  })

  appRef.value.appendChild(app.canvas)

  const backgroundTexture = PIXI.Texture.from(
    new URL('@/assets/hall/scene/scene.png', import.meta.url).href
  )
  const background = new PIXI.Sprite(backgroundTexture)
  background.width = app.screen.width
  background.height = app.screen.height
  app.stage.addChild(background)

  player = new PIXI.Graphics()
  player.beginFill(0x00ff00)
  player.drawCircle(0, 0, 20)
  player.endFill()
  player.x = app.screen.width / 2
  player.y = app.screen.height / 2
  app.stage.addChild(player)

  targetX = player.x
  targetY = player.y

  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen
  app.stage.on('pointerdown', (event) => {
    targetX = event.globalX
    targetY = event.globalY
  })

  app.ticker.add(() => {
    if (!player) return

    const dx = targetX - player.x
    const dy = targetY - player.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 5) {
      player.x += (dx / distance) * playerSpeed
      player.y += (dy / distance) * playerSpeed
    }
  })
})

onUnmounted(() => {
  if (app) {
    app.destroy(true, { children: true })
    app = null
  }
})
</script>

<template>
  <div ref="appRef" class="game-container"></div>
</template>

<style scoped>
.game-container {
  width: 100%;
  height: 100vh;
}
</style>
