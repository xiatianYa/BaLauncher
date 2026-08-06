<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  reactive,
  ref,
  watch,
} from 'vue'
import {
  NAvatar,
  NButton,
  NCollapse,
  NCollapseItem,
  NGrid,
  NGridItem,
  NModal,
  NSlider,
  NSpace,
  NSwitch,
  NTag,
  NText,
} from 'naive-ui'
import { useGameStore } from '@/store/modules/game'
import { useDict } from '@/hooks/business/dict'
import { $t } from '@/locales'
import SvgIcon from '@/components/custom/svg-icon.vue'

defineOptions({
  name: 'openGameJoin',
})

interface BounceState {
  x: number
  y: number
  vx: number
  vy: number
  size: number
}

interface DictItem {
  value?: string | number
  type?: 'primary' | 'info' | 'success' | 'warning' | 'error' | 'default'
  label?: string
}

const props = defineProps<{
  showJoinServer: boolean
}>()

const emit = defineEmits<{
  (e: 'update:showJoinServer', value: boolean): void
}>()

const gameStore = useGameStore()
const { dictOptions, dictType, dictLabel } = useDict()

const dictItem = (
  dict: string,
  value?: string | number,
): DictItem | undefined => {
  const list = dictOptions(dict) as DictItem[]
  if (!Array.isArray(list)) return undefined
  return list.find((item: DictItem) => item.value === value)
}

// ============================================================
// DOM 引用 / 动画状态
// ============================================================
const animationRef = ref<HTMLElement | null>(null)
const bounceStates = reactive<Record<string, BounceState>>({})
const cleanupAtMap = reactive<Record<string, number>>({})
let rafId: number | null = null
let lastTs = 0

// ============================================================
// 数据源：当前服务器 / 直接派生 store 原数据的响应式列表
// ============================================================
const currentServerId = computed<string>(() => {
  const sid = gameStore.joinServerInfo?.serverId
  return sid == null ? '' : String(sid)
})

const JOIN_RELATED_ACTION_KEYWORDS: ReadonlySet<string> = new Set([
  '开始挤服',
  '暂停挤服',
  '加入服务器',
])

const filterJoinRelatedLogs = (
  raw: Api.Game.PlayerActionLog[],
): Api.Game.PlayerActionLog[] => {
  const list = raw.filter((l) => {
    const content = (l?.actionContent ?? '').trim()
    if (!content) return false
    if (JOIN_RELATED_ACTION_KEYWORDS.has(content)) return true
    return content.includes('挤服') || content.includes('加入服务器')
  })
  list.sort((a, b) => {
    const ta = new Date(a.actionTime || '').getTime()
    const tb = new Date(b.actionTime || '').getTime()
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0
    return tb - ta
  })
  return list
}

// 存储约定：data-updater 已将 userGameDataMap[sid] / playerActionMap[sid] 统一为数组
const currentServerUserGameDataList = computed<Api.Game.UserGameData[]>(() => {
  const sid = currentServerId.value
  if (!sid) return []
  return gameStore.serverGameDataMap.userGameDataMap[sid]
})

const currentActionLogs = computed<Api.Game.PlayerActionLog[]>(() => {
  const sid = currentServerId.value
  if (!sid) return []
  return filterJoinRelatedLogs([
    ...gameStore.serverGameDataMap.playerActionMap[sid] || [],
  ])
})

const currentPlayingUserList = computed<Api.Game.UserGameData[]>(() => {
  const lastActionByUserId = new Map<string, Api.Game.PlayerActionLog>()
  for (const log of currentActionLogs.value) {
    const uid = log?.loginUser?.id
    if (uid == null) continue
    lastActionByUserId.set(String(uid), log)
  }
  const playingUsers: Api.Game.UserGameData[] = []
  for (const last of lastActionByUserId.values()) {
    const content = (last?.actionContent ?? '').trim()
    if (content === '开始挤服') {
      playingUsers.push({ loginUser: last.loginUser })
    }
  }
  return playingUsers
})

// ============================================================
// v-for key 辅助 + 时间戳格式化
// ============================================================
const getPlayerKey = (
  u: Api.Game.UserGameData,
  fallbackIndex: number,
) => {
  const id = u?.loginUser?.id
  return id != null ? String(id) : `idx_${fallbackIndex}`
}

const getActionLogKey = (
  log: Api.Game.PlayerActionLog,
  fallbackIndex: number,
) => {
  const uid = log?.loginUser?.id
  const t = log?.actionTime ?? ''
  const c = (log?.actionContent ?? '').trim()
  const fp = `${uid ?? ''}|${t}|${c}`
  return fp.length ? fp : `log_idx_${fallbackIndex}`
}

const formatActionTime = (t?: string): string => {
  if (!t) return ''
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return t
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

// ============================================================
// 弹回头像动画（requestAnimationFrame 物理循环）
// ============================================================
const createBounceState = (w: number, h: number): BounceState => {
  const size = 32
  const maxX = Math.max(0, w - size)
  const maxY = Math.max(0, h - size)
  const speedX = 0.05 + Math.random() * 0.06
  const speedY = 0.05 + Math.random() * 0.06

  const edge = Math.floor(Math.random() * 4)
  let x = 0
  let y = 0
  let vx = 0
  let vy = 0

  switch (edge) {
    case 0:
      x = Math.random() * maxX
      y = 0
      vx = (Math.random() > 0.5 ? 1 : -1) * speedX
      vy = speedY
      break
    case 1:
      x = Math.random() * maxX
      y = maxY
      vx = (Math.random() > 0.5 ? 1 : -1) * speedX
      vy = -speedY
      break
    case 2:
      x = 0
      y = Math.random() * maxY
      vx = speedX
      vy = (Math.random() > 0.5 ? 1 : -1) * speedY
      break
    default:
      x = maxX
      y = Math.random() * maxY
      vx = -speedX
      vy = (Math.random() > 0.5 ? 1 : -1) * speedY
      break
  }

  return { x, y, vx, vy, size }
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

const step = (ts: number) => {
  const el = animationRef.value
  if (!el) {
    rafId = requestAnimationFrame(step)
    return
  }

  const rect = el.getBoundingClientRect()
  const w = rect.width
  const h = rect.height
  const dt = Math.min(40, ts - lastTs || 16)
  lastTs = ts

  const keepKeys = new Set<string>()
  for (const user of currentPlayingUserList.value) {
    const userId = user?.loginUser?.id
    if (userId == null) continue
    const key = String(userId)
    keepKeys.add(key)
    delete cleanupAtMap[key]

    if (!bounceStates[key]) {
      bounceStates[key] = createBounceState(w, h)
    }

    const state = bounceStates[key]
    const maxX = Math.max(0, w - state.size)
    const maxY = Math.max(0, h - state.size)

    state.x += state.vx * dt
    state.y += state.vy * dt

    if (state.x <= 0) {
      state.x = 0
      state.vx = Math.abs(state.vx)
    } else if (state.x >= maxX) {
      state.x = maxX
      state.vx = -Math.abs(state.vx)
    }

    if (state.y <= 0) {
      state.y = 0
      state.vy = Math.abs(state.vy)
    } else if (state.y >= maxY) {
      state.y = maxY
      state.vy = -Math.abs(state.vy)
    }
  }

  const activeKeys = Array.from(keepKeys)
  for (let i = 0; i < activeKeys.length; i += 1) {
    for (let j = i + 1; j < activeKeys.length; j += 1) {
      const keyA = activeKeys[i]
      const keyB = activeKeys[j]
      const a = bounceStates[keyA]
      const b = bounceStates[keyB]
      if (!a || !b) continue

      const ar = a.size / 2
      const br = b.size / 2
      const ax = a.x + ar
      const ay = a.y + ar
      const bx = b.x + br
      const by = b.y + br

      let dx = bx - ax
      let dy = by - ay
      let dist = Math.hypot(dx, dy)
      const minDist = ar + br

      if (dist === 0) {
        dx = (Math.random() - 0.5) * 0.01
        dy = (Math.random() - 0.5) * 0.01
        dist = Math.hypot(dx, dy)
      }

      if (dist < minDist) {
        const nx = dx / dist
        const ny = dy / dist
        const overlap = minDist - dist

        a.x = clamp(a.x - nx * (overlap / 2), 0, Math.max(0, w - a.size))
        a.y = clamp(a.y - ny * (overlap / 2), 0, Math.max(0, h - a.size))
        b.x = clamp(b.x + nx * (overlap / 2), 0, Math.max(0, w - b.size))
        b.y = clamp(b.y + ny * (overlap / 2), 0, Math.max(0, h - b.size))

        const rvx = a.vx - b.vx
        const rvy = a.vy - b.vy
        const relVel = rvx * nx + rvy * ny
        if (relVel < 0) {
          a.vx -= relVel * nx
          a.vy -= relVel * ny
          b.vx += relVel * nx
          b.vy += relVel * ny
        }
      }
    }
  }

  for (const key of Object.keys(bounceStates)) {
    if (!keepKeys.has(key)) {
      if (!cleanupAtMap[key]) {
        cleanupAtMap[key] = ts + 260
      }
      if (ts >= cleanupAtMap[key]) {
        delete bounceStates[key]
        delete cleanupAtMap[key]
      }
    }
  }

  rafId = requestAnimationFrame(step)
}

const startAnimation = () => {
  if (rafId) return
  lastTs = performance.now()
  rafId = requestAnimationFrame(step)
}

const stopAnimation = () => {
  if (!rafId) return
  cancelAnimationFrame(rafId)
  rafId = null
}

const getAvatarStyle = (userId: string | number | undefined) => {
  if (userId == null) return {}
  const state = bounceStates[String(userId)]
  if (!state) return {}
  return {
    left: `${state.x}px`,
    top: `${state.y}px`,
    width: `${state.size}px`,
    height: `${state.size}px`,
  }
}

// ============================================================
// 业务辅助：地图类型 / 阵营 / 武器 / 在线进度条颜色
// ============================================================
const queryServerMapType = (mapName: string | undefined) =>
  gameStore.mapList.find((map) => map.mapName === mapName)?.type || ''

const getTeamColor = (team: string) => {
  if (!team) return 'default'
  return dictType('game_team', team.toLowerCase())
}

const getTeamLabel = (team: string) => {
  if (!team) return $t('serverJoin.team.unknown')
  return dictLabel('game_team', team.toLowerCase()) || team
}

const getWeaponName = (weaponName: string) => dictLabel('game_weapon', weaponName) || weaponName

const getOnLineColor = (players: number, maxPlayers: number) => {
  if (!players || !maxPlayers) return 'background-color: #00f91a;'
  if (players <= 20) return 'background-color: #00f91a;'
  if (players <= 40) return 'background-color: #5470ee;'
  if (players <= 60) return 'background-color: #ffa325;'
  if (players <= 80) return 'background-color: #ff4f00;'
  return 'background-color: #ff0000;'
}

// ============================================================
// 事件处理：关闭弹窗 / 开始挤服 / 暂停挤服 / 复制地址 / 启动游戏
// ============================================================
const handleCancelExit = () => {
  if (gameStore.isAutomatic) {
    emit('update:showJoinServer', false)
    gameStore.isJoinServerTrayVisible = true
    return
  }
  emit('update:showJoinServer', false)
}

const startJoinServer = () => {
  gameStore.reportPlayerAction('开始挤服')
  gameStore.startAutomaticJoinServer()
}

const stopJoinServer = () => {
  gameStore.reportPlayerAction('暂停挤服')
  gameStore.pauseAutomaticJoinServer()
  gameStore.stopAutomaticJoinServer()
}

const copyServerAddr = async () => {
  navigator.clipboard.writeText(`connect ${gameStore.joinServerInfo?.connectStr}`)
  window.$message?.success($t('server.copySuccess'))
}

const handleConfirmOpen = async () => {
  await gameStore.startGame()
}

// ============================================================
// 动画启停：跟随弹窗可见性 + 是否自动挤服
// ============================================================
watch(
  () => props.showJoinServer && gameStore.isAutomatic,
  (active) => {
    if (active) startAnimation()
    else stopAnimation()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopAnimation()
})
</script>

<template>
  <NModal v-model:show="props.showJoinServer" preset="card" class="w-750px rounded-md flex" size="small"
    :bordered="true" :closable="false" :onMaskClick="handleCancelExit" :mask-closable="false" :close-on-esc="false"
    content-style="padding:0px;">
    <div class="game-join-container">
      <!-- 右上角关闭按钮 -->
      <div class="game-join-close" @click="handleCancelExit">
        <SvgIcon icon="ic:baseline-close" />
      </div>

      <!-- 左侧：挤服配置（非自动挤服时显示） -->
      <div class="game-join-option" v-if="!gameStore.isAutomatic">
        <div class="game-join-option-content">
          <!-- 标题 -->
          <div class="title-container mb-10px">
            <div class="flex items-center font-size-20px">
              <SvgIcon icon="ic:twotone-settings" />
            </div>
            <h1 class="title-text text-16px font-bold bg-gradient-to-r bg-clip-text text-transparent ml-5px">
              <NText>{{ $t('serverJoin.title') }}</NText>
            </h1>
          </div>

          <!-- 触发人数滑块 -->
          <div class="mb-15px">
            <NSpace justify="space-between">
              <div class="flex items-center gap-3px">
                <div class="font-size-18px">
                  <SvgIcon icon="ic:baseline-accessible-forward" />
                </div>
                <div class="font-size-14px font-bold">
                  {{ $t('serverJoin.joinWhenPlayers') }}
                </div>
              </div>
              <NTag type="info" ghost size="small" :bordered="false">
                <div class="font-bold">
                  {{
                    $t('serverJoin.personCount', {
                      count: gameStore.automaticJoinConfig.joinServerPersonValue,
                    })
                  }}
                </div>
              </NTag>
            </NSpace>
            <NSlider :value="gameStore.automaticJoinConfig.joinServerPersonValue" :step="1" :min="1" :max="63"
              :tooltip="false" @update:value="gameStore.setJoinServerPersonValue" />
            <NSpace justify="space-between">
              <div class="font-bold font-size-10px">
                {{ $t('serverJoin.personCount', { count: 1 }) }}
              </div>
              <div class="font-bold font-size-10px">
                {{ $t('serverJoin.personCount', { count: 63 }) }}
              </div>
            </NSpace>
          </div>

          <!-- 线程数滑块 -->
          <div class="mb-15px">
            <NSpace justify="space-between">
              <div class="flex items-center gap-3px">
                <div class="font-size-18px">
                  <SvgIcon icon="heroicons:cpu-chip" />
                </div>
                <div class="font-size-14px font-bold">
                  {{ $t('serverJoin.threadCountLabel') }}
                </div>
              </div>
              <NTag type="info" ghost size="small" :bordered="false">
                <div class="font-bold">
                  {{
                    $t('serverJoin.threadCount', {
                      count: gameStore.automaticJoinConfig.joinServerCountValue,
                    })
                  }}
                </div>
              </NTag>
            </NSpace>
            <NSlider :value="gameStore.automaticJoinConfig.joinServerCountValue" :step="1" :min="1" :max="6"
              :tooltip="false" @update:value="gameStore.setJoinServerCountValue" />
            <NSpace justify="space-between">
              <div class="font-bold font-size-10px">
                {{ $t('serverJoin.threadCount', { count: 1 }) }}
              </div>
              <div class="font-bold font-size-10px">
                {{ $t('serverJoin.threadCount', { count: 6 }) }}
              </div>
            </NSpace>
          </div>

          <!-- 连接延迟滑块 -->
          <div class="mb-15px">
            <NSpace justify="space-between">
              <div class="flex items-center gap-3px">
                <div class="font-size-18px">
                  <SvgIcon icon="mdi:clock-outline" />
                </div>
                <div class="font-size-14px font-bold">
                  {{ $t('serverJoin.joinDelay') }}
                </div>
              </div>
              <NTag type="info" ghost size="small" :bordered="false">
                <div class="font-bold">
                  {{
                    $t('serverJoin.delayMs', {
                      delay: gameStore.automaticJoinConfig.joinServerDelayValue,
                    })
                  }}
                </div>
              </NTag>
            </NSpace>
            <NSlider :value="gameStore.automaticJoinConfig.joinServerDelayValue" :step="100" :min="0" :max="5000"
              :tooltip="false" @update:value="gameStore.setJoinServerDelayValue" />
            <NSpace justify="space-between">
              <div class="font-bold font-size-10px">
                {{ $t('serverJoin.delayMs', { delay: 0 }) }}
              </div>
              <div class="font-bold font-size-10px">
                {{ $t('serverJoin.delayMs', { delay: 5000 }) }}
              </div>
            </NSpace>
            <div class="flex items-center font-bold font-size-12px mt-5px">
              <div class="font-size-16px mr-5px">
                <SvgIcon icon="material-symbols:info-outline" />
              </div>
              {{ $t('serverJoin.joinDelayTip') }}
            </div>
          </div>

          <!-- 自动重试开关 -->
          <div class="mb-15px">
            <NSpace justify="space-between">
              <div class="flex items-center gap-3px">
                <div class="font-size-18px">
                  <SvgIcon icon="material-symbols:refresh" />
                </div>
                <div class="font-size-14px font-bold">
                  {{ $t('serverJoin.autoRetry') }}
                </div>
              </div>
              <NSwitch :value="gameStore.automaticJoinConfig.joinServerAutoRetryValue" :round="false"
                @update:value="gameStore.setJoinServerAutoRetryValue" />
            </NSpace>
            <div class="flex items-center font-bold font-size-12px mt-5px">
              <div class="font-size-16px mr-5px">
                <SvgIcon icon="material-symbols:info-outline" />
              </div>
              {{ $t('serverJoin.autoRetryTip') }}
            </div>
          </div>

          <!-- GSI 推送开关 -->
          <div class="mb-15px">
            <NSpace justify="space-between">
              <div class="flex items-center gap-3px">
                <div class="font-size-18px">
                  <SvgIcon icon="material-symbols:refresh" />
                </div>
                <div class="font-size-14px font-bold">
                  {{ $t('serverJoin.gisPush') }}
                </div>
              </div>
              <NSwitch :value="gameStore.automaticJoinConfig.pushGisValue" :round="false"
                @update:value="gameStore.setPushGisValue" />
            </NSpace>
            <div class="flex items-center font-bold font-size-12px mt-5px">
              <div class="font-size-16px mr-5px">
                <SvgIcon icon="material-symbols:info-outline" />
              </div>
              {{ $t('serverJoin.gisPushTip') }}
            </div>
          </div>
        </div>

        <!-- 底部操作按钮（配置模式） -->
        <div class="game-join-option-footer">
          <NSpace justify="space-between">
            <NButton v-if="!gameStore.isGameRunning" type="info" ghost strong class="rounded-6px"
              :loading="gameStore.isGameLaunching" @click="handleConfirmOpen">
              <template #icon>
                <SvgIcon icon="hugeicons:start-up-02" />
              </template>
              {{
                gameStore.isGameLaunching
                  ? $t('serverJoin.launching')
                  : $t('serverJoin.startGame')
              }}
            </NButton>
            <NButton v-if="gameStore.isGameRunning" type="success" ghost class="rounded-6px" :disabled="true">
              <template #icon>
                <SvgIcon icon="ix:success-filled" />
              </template>
              {{ $t('serverJoin.gameStarted') }}
            </NButton>
            <NButton type="success" ghost strong class="rounded-md" :disabled="!gameStore.isGameRunning"
              @click="startJoinServer">
              <template #icon>
                <SvgIcon icon="solar:gamepad-broken" />
              </template>
              {{
                gameStore.isGameRunning
                  ? $t('serverJoin.startJoin')
                  : $t('serverJoin.pleaseStartGame')
              }}
            </NButton>
          </NSpace>
        </div>
      </div>

      <!-- 中间：弹回头像 + 动态 + 操作按钮（自动挤服时显示） -->
      <div class="game-join-person" v-if="gameStore.isAutomatic">
        <div class="game-join-person-adnimation" ref="animationRef">
          <TransitionGroup name="bounce" tag="div" class="bounce-layer">
            <div v-for="(user, index) in currentPlayingUserList" :key="getPlayerKey(user, index)" class="bounce-avatar"
              :style="getAvatarStyle(user.loginUser?.id)">
              <NAvatar round size="small" :src="user.loginUser?.avatar"
                fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg" />
            </div>
          </TransitionGroup>
        </div>

        <!-- 玩家动态列表（只显示挤服相关：开始挤服/暂停挤服/加入服务器） -->
        <div class="game-join-person-dynamic">
          <div class="dynamic-header">
            <div class="dynamic-title">
              <SvgIcon icon="material-symbols:bolt" class="dynamic-icon" />
              <span>{{ $t('serverJoin.dynamicTitle') }}</span>
            </div>
          </div>
          <div class="dynamic-body">
            <TransitionGroup name="dynamic" tag="div" class="dynamic-list">
              <div v-for="(log, index) in currentActionLogs" :key="getActionLogKey(log, index)" class="dynamic-item">
                <span class="dynamic-dot"></span>
                <span class="dynamic-text">
                  <template v-if="formatActionTime(log.actionTime)">
                    <span class="dynamic-time">
                      [{{ formatActionTime(log.actionTime) }}]
                    </span>
                  </template>
                  <span class="dynamic-nickname">
                    {{ log.loginUser?.nickName || $t('serverJoin.unknownPlayer') }}
                  </span>
                  <span class="dynamic-divider"> - </span>
                  <span class="dynamic-content">{{ log.actionContent }}</span>
                </span>
              </div>
            </TransitionGroup>
          </div>
        </div>

        <!-- 底部操作按钮（动画模式） -->
        <NSpace justify="space-between">
          <NButton v-if="gameStore.isGameRunning" type="success" ghost class="rounded-6px" :disabled="true">
            <template #icon>
              <SvgIcon icon="ix:success-filled" />
            </template>
            {{ $t('serverJoin.gameStarted') }}
          </NButton>
          <NButton type="warning" ghost strong class="rounded-md" @click="stopJoinServer">
            <template #icon>
              <SvgIcon icon="lets-icons:stop" />
            </template>
            {{ $t('serverJoin.pauseJoin') }}
          </NButton>
        </NSpace>
      </div>

      <!-- 右侧：服务器卡片 + 玩家列表 -->
      <div class="game-join-info" v-if="gameStore.joinServerInfo">
        <div class="server-card overflow-hidden flex flex-col">
          <img v-if="gameStore.joinServerInfo.mapUrl" class="server-card-bg" :src="gameStore.joinServerInfo.mapUrl" />
          <div class="server-online" :style="`
              ${getOnLineColor(
            gameStore.joinServerInfo.numPlayers,
            gameStore.joinServerInfo.maxPlayers,
          )}
              width: ${(gameStore.joinServerInfo.numPlayers
              / gameStore.joinServerInfo.maxPlayers)
            * 100
            }%;
            `"></div>
          <div class="server-card-mask"></div>
          <div class="mt-8px ml-8px font-size-13px flex items-center position-relative color-#fff font-bold">
            {{ gameStore.joinServerInfo.serverName }}
          </div>
          <div class="mt-6px ml-8px font-size-13px flex items-center position-relative color-#fff font-bold">
            <SvgIcon icon="tdesign:translate" class="mr-5px font-size-16px" />
            {{
              gameStore.joinServerInfo.mapLabel || $t('server.noTranslation')
            }}
          </div>
          <div class="mt-6px ml-8px font-size-13px flex items-center position-relative color-#fff font-bold">
            <SvgIcon icon="mdi:map-legend" class="mr-5px font-size-16px" />
            {{ gameStore.joinServerInfo.mapName }}
            ({{ gameStore.joinServerInfo.numPlayers }}/{{
              gameStore.joinServerInfo.maxPlayers
            }})
          </div>
          <div v-if="queryServerMapType(gameStore?.joinServerInfo?.mapName)"
            class="flex items-center ml-8px mt-6px position-relative font-bold">
            <NTag size="small" round class="mr-3px" ghost :type="dictItem('game_type', gameStore?.joinServerInfo?.type)?.type
              || 'primary'
              " v-show="gameStore?.joinServerInfo.type">
              {{ dictItem('game_type', gameStore?.joinServerInfo?.type)?.label }}
            </NTag>
            <NTag v-for="(tag, index) in gameStore.joinServerInfo.tag" :key="index" size="small" round class="mr-3px"
              type="success">
              {{ dictItem('game_tag', tag)?.label }}
            </NTag>
          </div>
          <div class="flex items-center ml-8px mt-6px mb-6px position-relative font-bold">
            <div class="mr-5px cursor-pointer hover:opacity-80" @click="copyServerAddr">
              <SvgIcon icon="material-symbols:bring-your-own-ip" class="font-size-14px color-#a5a5a5" />
            </div>
            <div class="font-size-12px color-#a5a5a5 font-bold">
              {{ gameStore.joinServerInfo.connectStr }}
            </div>
            <div class="ml-5px cursor-pointer hover:opacity-80" @click="copyServerAddr">
              <SvgIcon icon="mdi:content-copy" class="font-size-14px color-#a5a5a5" />
            </div>
          </div>
        </div>

        <div class="server-players overflow-y-auto">
          <NGrid x-gap="5" :cols="1">
            <NGridItem v-for="(player, index) in currentServerUserGameDataList" :key="getPlayerKey(player, index)"
              :name="index" class="mb-5px mt-5px">
              <NCollapse accordion>
                <NCollapseItem>
                  <template #header>
                    <div class="flex items-center gap-2">
                      <NAvatar round size="small" :src="player.loginUser?.avatar"
                        fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg" />
                      <span class="ml-2 font-bold">
                        {{
                          player.loginUser?.nickName
                          || $t('serverJoin.unknownPlayer')
                        }}
                      </span>
                      <NTag size="small" :type="getTeamColor(player.team || '')" class="ml-2" :bordered="false">
                        {{ getTeamLabel(player.team || '') }}
                      </NTag>
                    </div>
                  </template>
                  <div class="grid grid-cols-2 gap-5px text-12px font-bold player-info">
                    <div class="flex items-center">
                      <div class="flex items-center justify-center font-size-16px">
                        <SvgIcon icon="solar:health-broken" class="mr-5px" />
                      </div>
                      <NText>
                        {{ $t('serverJoin.stats.health', { value: player.health ?? 0 }) }}
                      </NText>
                    </div>
                    <div class="flex items-center">
                      <div class="flex items-center justify-center font-size-16px">
                        <SvgIcon icon="hugeicons:body-armor" class="mr-5px" />
                      </div>
                      <NText>
                        {{ $t('serverJoin.stats.armor', { value: player.armor ?? 0 }) }}
                      </NText>
                    </div>
                    <div class="flex items-center">
                      <div class="flex items-center justify-center font-size-16px">
                        <SvgIcon icon="material-symbols:price-change-outline" class="mr-5px" />
                      </div>
                      <NText>
                        {{ $t('serverJoin.stats.money', { value: player.money ?? 0 }) }}
                      </NText>
                    </div>
                    <div class="flex items-center">
                      <div class="flex items-center justify-center font-size-16px">
                        <SvgIcon icon="ph:knife" class="mr-5px" />
                      </div>
                      <NText>
                        {{ $t('serverJoin.stats.kills', { value: player.kills ?? 0 }) }}
                      </NText>
                    </div>
                    <div class="flex items-center">
                      <div class="flex items-center justify-center font-size-16px">
                        <SvgIcon icon="mdi:scoreboard-outline" class="mr-5px" />
                      </div>
                      <NText>
                        {{ $t('serverJoin.stats.score', { value: player.score ?? 0 }) }}
                      </NText>
                    </div>
                    <div class="flex items-center">
                      <div class="flex items-center justify-center font-size-16px">
                        <SvgIcon icon="solar:tag-price-broken" class="mr-5px" />
                      </div>
                      <NText>
                        {{ $t('serverJoin.stats.equipValue', { value: player.equipValue ?? 0 }) }}
                      </NText>
                    </div>
                    <div class="flex items-center">
                      <div class="flex items-center justify-center font-size-16px">
                        <SvgIcon icon="hugeicons:gun" class="mr-5px" />
                      </div>
                      <NText>
                        {{
                          player.weapon?.name
                            ? getWeaponName(player.weapon.name)
                            : $t('serverJoin.weapon.none')
                        }}
                      </NText>
                    </div>
                  </div>
                </NCollapseItem>
              </NCollapse>
            </NGridItem>
          </NGrid>
        </div>
      </div>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.game-join-container {
  position: relative;
  display: flex;
  height: 400px;
  padding: 40px 20px 20px 20px;
  gap: 15px;

  .game-join-close {
    position: absolute;
    top: 8px;
    right: 10px;
    font-size: 22px;
    cursor: pointer;
  }

  .game-join-option {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    padding: 15px;
    overflow: hidden;
    background-color: rgba(133, 133, 133, 0.1);
    border-radius: 10px;

    .game-join-option-content {
      flex: 1;
      overflow-y: auto;
      padding-right: 5px;
    }

    .game-join-option-footer {
      flex-shrink: 0;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid rgba(var(--app-rgb), 0.1);
    }
  }

  .game-join-person {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
    height: 100%;
    padding: 15px;
    background-color: rgba(133, 133, 133, 0.1);
    border-radius: 10px;

    .game-join-person-adnimation {
      flex: 1;
      position: relative;
      overflow: hidden;
      border-radius: 10px;
      background-color: rgba(0, 0, 0, 0.08);
    }

    .bounce-layer {
      position: absolute;
      inset: 0;
    }

    .bounce-avatar {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .bounce-enter-active,
    .bounce-leave-active {
      transition: opacity 0.25s ease, transform 0.25s ease;
    }

    .bounce-enter-from,
    .bounce-leave-to {
      opacity: 0;
      transform: scale(0.2);
    }

    .bounce-enter-to,
    .bounce-leave-from {
      opacity: 1;
      transform: scale(1);
    }

    .game-join-person-dynamic {
      display: flex;
      flex-direction: column;
      gap: 6px;
      height: 110px;
      margin-top: 10px;
      margin-bottom: 10px;
      padding: 10px;
      border-radius: 12px;
      background-color: rgba(0, 0, 0, 0.08);
      font-size: 12px;
      font-weight: 700;
    }

    .dynamic-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .dynamic-title {
      display: flex;
      align-items: center;
      gap: 6px;
      opacity: 0.9;
    }

    .dynamic-icon {
      font-size: 14px;
    }

    .dynamic-count {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.18);
      border: 1px solid rgba(var(--app-rgb), 0.08);
    }

    .dynamic-body {
      flex: 1;
      overflow: hidden;
    }

    .dynamic-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 100%;
      overflow-y: auto;
      padding-right: 4px;
    }

    .dynamic-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.10);
      border: 1px solid rgba(var(--app-rgb), 0.06);
      line-height: 1.2;
    }

    .dynamic-dot {
      flex: 0 0 auto;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(0, 249, 26, 1), rgba(84, 112, 238, 1));
      box-shadow: 0 0 0 2px rgba(var(--app-rgb), 0.06);
    }

    .dynamic-text {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0.95;
    }

    .dynamic-enter-active,
    .dynamic-leave-active {
      transition: opacity 0.18s ease, transform 0.18s ease;
    }

    .dynamic-enter-from,
    .dynamic-leave-to {
      opacity: 0;
      transform: translateY(6px);
    }

    .dynamic-enter-to,
    .dynamic-leave-from {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .game-join-info {
    display: flex;
    flex-direction: column;
    flex: 0.9;
    height: 100%;
    overflow: hidden;
    background-color: rgba(133, 133, 133, 0.1);
    border-radius: 10px;

    .server-card {
      position: relative;
      width: 100%;
      font-family: 'SimHei';
      overflow: hidden;
      background-color: #a5aaa3;
      transition: all 0.2s ease;

      .server-card-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 0;
      }

      .server-online {
        position: absolute;
        height: 4px;
        width: 100%;
        z-index: 10;
      }

      .server-card-mask {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 1;
        background-color: rgba(0, 0, 0, 0.5);
      }
    }

    .server-players {
      flex: 1;
      overflow-y: auto;
      padding: 5px 10px 5px 10px;

      .player-info {
        padding: 10px;
        border-radius: 8px;
        background-color: rgba(133, 133, 133, 0.1);
      }
    }
  }
}

.title-container {
  position: relative;
  display: flex;
  align-items: center;

  .setting-icon {
    display: inline-block;
    font-size: 18px;
    animation: rotate 10s linear infinite;
  }

  .title-text {
    display: inline-flex;
    align-items: center;
    height: 100%;
    letter-spacing: 0.05em;

    .title-char {
      display: inline-block;
    }
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
