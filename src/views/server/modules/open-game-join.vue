<script setup lang="ts">
import { useGameStore } from '@/store/modules/game';
import { NModal, NText, NSpace, NTag, NButton, NSwitch, NSlider, NCollapse, NCollapseItem, NAvatar } from 'naive-ui';
import { useDict } from '@/hooks/business/dict';
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    showJoinServer: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:showJoinServer', value: boolean): void;
}>();

const gameStore = useGameStore();
const { dictOptions } = useDict();
const { t } = useI18n();

type BounceState = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
};

const animationRef = ref<HTMLElement | null>(null);
const bounceStates = reactive<Record<string, BounceState>>({});
const cleanupAtMap = reactive<Record<string, number>>({});
let rafId: number | null = null;
let lastTs = 0;

const automaticDynamicMessages = computed(() => {
    const list = gameStore.currentAutomaticPlayerDynamicList;
    return list.length <= 12 ? list : list.slice(-12);
});

const createBounceState = (w: number, h: number): BounceState => {
    const size = 32;
    const maxX = Math.max(0, w - size);
    const maxY = Math.max(0, h - size);
    const speedX = (0.05 + Math.random() * 0.06);
    const speedY = (0.05 + Math.random() * 0.06);

    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    let vx = 0;
    let vy = 0;

    if (edge === 0) {
        x = Math.random() * maxX;
        y = 0;
        vx = (Math.random() > 0.5 ? 1 : -1) * speedX;
        vy = speedY;
    } else if (edge === 1) {
        x = Math.random() * maxX;
        y = maxY;
        vx = (Math.random() > 0.5 ? 1 : -1) * speedX;
        vy = -speedY;
    } else if (edge === 2) {
        x = 0;
        y = Math.random() * maxY;
        vx = speedX;
        vy = (Math.random() > 0.5 ? 1 : -1) * speedY;
    } else {
        x = maxX;
        y = Math.random() * maxY;
        vx = -speedX;
        vy = (Math.random() > 0.5 ? 1 : -1) * speedY;
    }

    return {
        x,
        y,
        vx,
        vy,
        size
    };
};

const step = (ts: number) => {
    const el = animationRef.value;
    if (!el) {
        rafId = requestAnimationFrame(step);
        return;
    }

    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const dt = Math.min(40, ts - lastTs || 16);
    lastTs = ts;

    const keepKeys = new Set<string>();
    for (const player of gameStore.currentAutomaticPlayerList) {
        const key = String(player.userId);
        keepKeys.add(key);
        delete cleanupAtMap[key];

        if (!bounceStates[key]) {
            bounceStates[key] = createBounceState(w, h);
        }

        const state = bounceStates[key];
        const maxX = Math.max(0, w - state.size);
        const maxY = Math.max(0, h - state.size);

        state.x += state.vx * dt;
        state.y += state.vy * dt;

        if (state.x <= 0) {
            state.x = 0;
            state.vx = Math.abs(state.vx);
        } else if (state.x >= maxX) {
            state.x = maxX;
            state.vx = -Math.abs(state.vx);
        }

        if (state.y <= 0) {
            state.y = 0;
            state.vy = Math.abs(state.vy);
        } else if (state.y >= maxY) {
            state.y = maxY;
            state.vy = -Math.abs(state.vy);
        }
    }

    const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

    const activeKeys = Array.from(keepKeys);
    for (let i = 0; i < activeKeys.length; i += 1) {
        for (let j = i + 1; j < activeKeys.length; j += 1) {
            const keyA = activeKeys[i];
            const keyB = activeKeys[j];
            const a = bounceStates[keyA];
            const b = bounceStates[keyB];
            if (!a || !b) continue;

            const ar = a.size / 2;
            const br = b.size / 2;
            const ax = a.x + ar;
            const ay = a.y + ar;
            const bx = b.x + br;
            const by = b.y + br;

            let dx = bx - ax;
            let dy = by - ay;
            let dist = Math.hypot(dx, dy);
            const minDist = ar + br;

            if (dist === 0) {
                dx = (Math.random() - 0.5) * 0.01;
                dy = (Math.random() - 0.5) * 0.01;
                dist = Math.hypot(dx, dy);
            }

            if (dist < minDist) {
                const nx = dx / dist;
                const ny = dy / dist;
                const overlap = minDist - dist;

                a.x = clamp(a.x - nx * (overlap / 2), 0, Math.max(0, w - a.size));
                a.y = clamp(a.y - ny * (overlap / 2), 0, Math.max(0, h - a.size));
                b.x = clamp(b.x + nx * (overlap / 2), 0, Math.max(0, w - b.size));
                b.y = clamp(b.y + ny * (overlap / 2), 0, Math.max(0, h - b.size));

                const rvx = a.vx - b.vx;
                const rvy = a.vy - b.vy;
                const relVel = rvx * nx + rvy * ny;
                if (relVel < 0) {
                    a.vx -= relVel * nx;
                    a.vy -= relVel * ny;
                    b.vx += relVel * nx;
                    b.vy += relVel * ny;
                }
            }
        }
    }

    for (const key of Object.keys(bounceStates)) {
        if (!keepKeys.has(key)) {
            if (!cleanupAtMap[key]) {
                cleanupAtMap[key] = ts + 260;
            }
            if (ts >= cleanupAtMap[key]) {
                delete bounceStates[key];
                delete cleanupAtMap[key];
            }
        }
    }

    rafId = requestAnimationFrame(step);
};

const startAnimation = () => {
    if (rafId) return;
    lastTs = performance.now();
    rafId = requestAnimationFrame(step);
};

const stopAnimation = () => {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = null;
};

const getAvatarStyle = (userId: number) => {
    const state = bounceStates[String(userId)];
    if (!state) return {};
    return {
        left: `${state.x}px`,
        top: `${state.y}px`,
        width: `${state.size}px`,
        height: `${state.size}px`
    };
};

const getMapByMapName = (mapName: string) => {
    return gameStore.mapList.find(map => map.mapName === mapName);
};

const queryServerMapType = (mapName: string | undefined) => {
    return gameStore.mapList.find(map => map.mapName === mapName)?.type || '';
};

const queryServerMapTag = (mapName: string | undefined) => {
    return gameStore.mapList.find(map => map.mapName === mapName)?.tag || '';
};

const getTeamColor = (team: string) => {
    if (!team) return 'default';
    switch (team.toLowerCase()) {
        case 'ct': return 'info';
        case 't': return 'warning';
        case 'spectator': return 'default';
        default: return 'default';
    }
};

const getTeamLabel = (team: string) => {
    if (!team) return t('serverJoin.team.unknown');
    switch (team.toLowerCase()) {
        case 'ct': return t('serverJoin.team.ct');
        case 't': return t('serverJoin.team.t');
        case 'spectator': return t('serverJoin.team.spectator');
        default: return team;
    }
};

const getOnLineColor = (players: number, maxPlayers: number) => {
    if (!players || !maxPlayers) return 'background-color: #00f91a;';
    if (players <= 20) {
        return `background-color: #00f91a;`;
    } else if (players <= 40) {
        return `background-color: #5470ee;`;
    } else if (players <= 60) {
        return `background-color: #ffa325;`;
    } else if (players <= 80) {
        return `background-color: #ff4f00;`;
    }
    return `background-color: #ff0000;`;
};

const handleCancelExit = () => {
    // 如果正在自动挤服
    if (gameStore.isAutomatic) {
        // 隐藏当前窗口
        emit('update:showJoinServer', false);
        // 显示悬浮球（托盘）
        gameStore.isJoinServerTrayVisible = true;
        return;
    }
    //所有玩家的挤服动态
    gameStore.currentAutomaticPlayerList.splice(0, gameStore.currentAutomaticPlayerList.length);
    //所有服务器的GIS动态
    gameStore.currentGisPlayerList.splice(0, gameStore.currentGisPlayerList.length);
    //清空记录
    gameStore.currentAutomaticPlayerDynamicList.splice(0, gameStore.currentAutomaticPlayerDynamicList.length);
    //清空连接动态
    gameStore.stopAutomaticJoinServer();

    emit('update:showJoinServer', false);
    return;
};

//开始挤服
const startJoinServer = () => {
    gameStore.sendAutomaticDynamic(t('serverJoin.dynamicJoining'));
    gameStore.startAutomaticJoinServer();
};

//暂停挤服
const stopJoinServer = () => {
    gameStore.sendAutomaticDynamic(t('serverJoin.dynamicPaused'));
    //清空记录
    gameStore.currentAutomaticPlayerDynamicList.splice(0, gameStore.currentAutomaticPlayerDynamicList.length);
    gameStore.stopAutomaticJoinServer();
};

// 启动游戏
const handleConfirmOpen = async () => {
    await gameStore.startGame();
};

watch(
    () => props.showJoinServer && gameStore.isAutomatic,
    (active) => {
        if (active) startAnimation();
        else stopAnimation();
    },
    { immediate: true }
);

onBeforeUnmount(() => {
    stopAnimation();
});
</script>

<template>
    <NModal v-model:show="props.showJoinServer" preset="card" class="w-750px rounded-md flex" size="small"
        :bordered="true" :closable="false" :onMaskClick="handleCancelExit" :mask-closable="false" :close-on-esc="false"
        content-style="padding:0px;">
        <div class="game-join-container">
            <div class="game-join-close" @click="handleCancelExit">
                <SvgIcon icon="ic:baseline-close" />
            </div>
            <div class="game-join-option" v-if="!gameStore.isAutomatic">
                <div class="title-container mb-10px">
                    <div class="flex items-center font-size-20px">
                        <SvgIcon icon="ic:twotone-settings"></SvgIcon>
                    </div>
                    <h1 class="title-text text-16px font-bold bg-gradient-to-r bg-clip-text text-transparent ml-5px">
                        <NText>
                            {{ $t('serverJoin.title') }}
                        </NText>
                    </h1>
                </div>
                <div class="mb-15px">
                    <NSpace justify="space-between">
                        <div class="flex items-center gap-3px">
                            <div class="font-size-18px">
                                <SvgIcon icon="ic:baseline-accessible-forward"></SvgIcon>
                            </div>
                            <div class="font-size-14px font-bold">
                                {{ $t('serverJoin.joinWhenPlayers') }}
                            </div>
                        </div>
                        <NTag type="info" ghost size="small" :bordered="false">
                            <div class="font-bold">
                                {{ $t('serverJoin.personCount', {
                                    count:
                                        gameStore.automaticJoinConfig.joinServerPersonValue
                                }) }}
                            </div>
                        </NTag>
                    </NSpace>
                    <NSlider v-model:value="gameStore.automaticJoinConfig.joinServerPersonValue" :step="1" :min="1"
                        :max="63" :tooltip="false" />
                    <NSpace justify="space-between">
                        <div class="font-bold font-size-10px">
                            {{ $t('serverJoin.personCount', { count: 1 }) }}
                        </div>
                        <div class="font-bold font-size-10px">
                            {{ $t('serverJoin.personCount', { count: 63 }) }}
                        </div>
                    </NSpace>
                </div>
                <div class="mb-15px">
                    <NSpace justify="space-between">
                        <div class="flex items-center gap-3px">
                            <div class="font-size-18px">
                                <SvgIcon icon="heroicons:cpu-chip"></SvgIcon>
                            </div>
                            <div class="font-size-14px font-bold">
                                {{ $t('serverJoin.threadCountLabel') }}
                            </div>
                        </div>
                        <NTag type="info" ghost size="small" :bordered="false">
                            <div class="font-bold">
                                {{ $t('serverJoin.threadCount', {
                                    count:
                                        gameStore.automaticJoinConfig.joinServerCountValue
                                }) }}
                            </div>
                        </NTag>
                    </NSpace>
                    <NSlider v-model:value="gameStore.automaticJoinConfig.joinServerCountValue" :step="1" :min="1"
                        :max="6" :tooltip="false" />
                    <NSpace justify="space-between">
                        <div class="font-bold font-size-10px">
                            {{ $t('serverJoin.threadCount', { count: 1 }) }}
                        </div>
                        <div class="font-bold font-size-10px">
                            {{ $t('serverJoin.threadCount', { count: 6 }) }}
                        </div>
                    </NSpace>
                </div>
                <div class="mb-15px">
                    <NSpace justify="space-between" align="center">
                        <div class="flex items-center gap-3px">
                            <div class="font-size-18px">
                                <SvgIcon icon="material-symbols:refresh"></SvgIcon>
                            </div>
                            <div class="font-size-14px font-bold">
                                {{ $t('serverJoin.autoRetry') }}
                            </div>
                        </div>
                        <NSwitch v-model:value="gameStore.automaticJoinConfig.joinServerAutoRetryValue"
                            :round="false" />
                    </NSpace>
                    <div class="flex items-center font-bold font-size-12px mt-5px">
                        <div class="font-size-16px mr-5px">
                            <SvgIcon icon="material-symbols:info-outline"></SvgIcon>
                        </div>
                        {{ $t('serverJoin.autoRetryTip') }}
                    </div>
                </div>
                <NSpace justify="space-between">
                    <NButton type="info" ghost strong class="rounded-6px" v-if="!gameStore.isGameRunning"
                        @click="handleConfirmOpen" :loading="gameStore.isGameLaunching">
                        <template #icon>
                            <SvgIcon icon="hugeicons:start-up-02" />
                        </template>
                        {{ gameStore.isGameLaunching ? t('serverJoin.launching') : t('serverJoin.startGame') }}
                    </NButton>
                    <NButton type="success" ghost class="rounded-6px" v-if="gameStore.isGameRunning" :disabled="true">
                        <template #icon>
                            <SvgIcon icon="ix:success-filled" />
                        </template>
                        {{ $t('serverJoin.gameStarted') }}
                    </NButton>
                    <NButton type="success" ghost strong @click="startJoinServer" class="rounded-md"
                        :disabled="!gameStore.isGameRunning">
                        <template #icon>
                            <SvgIcon icon="solar:gamepad-broken"></SvgIcon>
                        </template>
                        {{ gameStore.isGameRunning ? t('serverJoin.startJoin') : t('serverJoin.pleaseStartGame') }}
                    </NButton>
                </NSpace>
            </div>
            <div class="game-join-person" v-if="gameStore.isAutomatic">
                <div class="game-join-person-adnimation" ref="animationRef">
                    <TransitionGroup name="bounce" tag="div" class="bounce-layer">
                        <div v-for="player in gameStore.currentAutomaticPlayerList" :key="player.userId"
                            class="bounce-avatar" :style="getAvatarStyle(player.userId)">
                            <NAvatar round size="small" :src="player.avatar"
                                fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg" />
                        </div>
                    </TransitionGroup>
                </div>
                <div class="game-join-person-dynamic">
                    <div class="dynamic-header">
                        <div class="dynamic-title">
                            <SvgIcon icon="material-symbols:bolt" class="dynamic-icon" />
                            <span>{{ $t('serverJoin.dynamicTitle') }}</span>
                        </div>
                        <div class="dynamic-count">{{ gameStore.currentAutomaticPlayerDynamicList.length }}</div>
                    </div>
                    <div class="dynamic-body">
                        <TransitionGroup name="dynamic" tag="div" class="dynamic-list">
                            <div v-for="(msg, index) in automaticDynamicMessages" :key="`${msg}-${index}`"
                                class="dynamic-item">
                                <span class="dynamic-dot"></span>
                                <span class="dynamic-text">{{ msg }}</span>
                            </div>
                        </TransitionGroup>
                    </div>
                </div>
                <NSpace justify="space-between">
                    <NButton type="success" ghost class="rounded-6px" v-if="gameStore.isGameRunning" :disabled="true">
                        <template #icon>
                            <SvgIcon icon="ix:success-filled" />
                        </template>
                        {{ $t('serverJoin.gameStarted') }}
                    </NButton>
                    <NButton type="warning" ghost strong @click="stopJoinServer" class="rounded-md">
                        <template #icon>
                            <SvgIcon icon="lets-icons:stop"></SvgIcon>
                        </template>
                        {{ $t('serverJoin.pauseJoin') }}
                    </NButton>
                </NSpace>
            </div>
            <div class="game-join-info" v-if="gameStore.joinServerInfo">
                <div class="server-card overflow-hidden flex flex-col">
                    <img v-if="getMapByMapName(gameStore.joinServerInfo.map)" class="server-card-bg"
                        :src="getMapByMapName(gameStore.joinServerInfo.map)?.mapUrl" />
                    <div class="server-online"
                        :style="`${getOnLineColor(gameStore.joinServerInfo.players, gameStore.joinServerInfo.maxPlayers)}width: ${(gameStore.joinServerInfo.players / gameStore.joinServerInfo.maxPlayers) * 100}%;`">
                    </div>
                    <div class="server-card-mask"></div>
                    <div class="mt-8px ml-8px font-size-13px flex items-center position-relative color-#fff font-bold">
                        {{ gameStore.joinServerInfo.name }}
                    </div>
                    <div class="mt-6px ml-8px font-size-13px flex items-center position-relative color-#fff font-bold">
                        <SvgIcon icon="tdesign:translate" class="mr-5px font-size-16px" />
                        {{ getMapByMapName(gameStore.joinServerInfo.map)?.mapLabel || $t('server.noTranslation') }}
                    </div>
                    <div class="mt-6px ml-8px font-size-13px flex items-center position-relative color-#fff font-bold">
                        <SvgIcon icon="mdi:map-legend" class="mr-5px font-size-16px" />
                        {{ gameStore.joinServerInfo.map }} ({{ gameStore.joinServerInfo.players }}/{{
                            gameStore.joinServerInfo.maxPlayers }})
                    </div>
                    <div class="flex items-center ml-8px mt-6px position-relative font-bold"
                        v-if="queryServerMapType(gameStore?.joinServerInfo?.map)">
                        <NTag size="small" round class="mr-3px" ghost
                            :type="dictOptions('game_type').find((item: any) => item.value === queryServerMapType(gameStore?.joinServerInfo?.map))?.type">
                            {{dictOptions('game_type').find((item: any) => item.value ===
                                queryServerMapType(gameStore?.joinServerInfo?.map))?.label}}
                        </NTag>
                        <NTag v-for="(tag, index) in queryServerMapTag(gameStore.joinServerInfo.map)" :key="index"
                            size="small" round class="mr-3px" type="success">
                            {{dictOptions('game_tag').find((item: any) => item.value === tag)?.label}}
                        </NTag>
                    </div>
                    <div class="flex items-center ml-8px mt-6px mb-6px position-relative font-bold">
                        <SvgIcon icon="material-symbols:bring-your-own-ip"
                            class="mr-5px font-size-12px color-#a5a5a5" />
                        <div class="font-size-12px color-#a5a5a5 font-bold">
                            {{ gameStore.joinServerInfo.addr }}
                        </div>
                    </div>
                </div>
                <div class="server-players overflow-y-auto">
                    <NGrid x-gap="5" :cols="1">
                        <NGridItem v-for="(player, index) in gameStore.currentGisPlayerList" :key="index" :name="index"
                            v-show="player.team !== 'unknown'" class="mb-5px mt-5px">
                            <NCollapse accordion>
                                <NCollapseItem>
                                    <template #header>
                                        <div class="flex items-center gap-2">
                                            <NAvatar round size="small" :src="player.loginUser?.avatar"
                                                fallback-src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg" />
                                            <span class="ml-2 font-bold">{{ player.loginUser?.nickName ||
                                                $t('serverJoin.unknownPlayer')
                                            }}</span>
                                            <NTag size="small" :type="getTeamColor(player.team)" class="ml-2"
                                                :bordered="false">
                                                {{ getTeamLabel(player.team) }}
                                            </NTag>
                                        </div>
                                    </template>
                                    <div class="grid grid-cols-2 gap-5px text-12px font-bold player-info">
                                        <div class="flex items-center">
                                            <div class="flex items-center justify-center font-size-16px">
                                                <SvgIcon icon="solar:health-broken" class="mr-5px" />
                                            </div>
                                            <NText>
                                                {{ $t('serverJoin.stats.health', { value: player.health }) }}
                                            </NText>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="flex items-center justify-center font-size-16px">
                                                <SvgIcon icon="hugeicons:body-armor" class="mr-5px" />
                                            </div>
                                            <NText>
                                                {{ $t('serverJoin.stats.armor', { value: player.armor }) }}
                                            </NText>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="flex items-center justify-center font-size-16px">
                                                <SvgIcon icon="material-symbols:price-change-outline" class="mr-5px" />
                                            </div>
                                            <NText>
                                                {{ $t('serverJoin.stats.money', { value: player.money }) }}
                                            </NText>
                                        </div>

                                        <div class="flex items-center">
                                            <div class="flex items-center justify-center font-size-16px">
                                                <SvgIcon icon="ph:knife" class="mr-5px" />
                                            </div>
                                            <NText>
                                                {{ $t('serverJoin.stats.kills', { value: player.kills }) }}
                                            </NText>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="flex items-center justify-center font-size-16px">
                                                <SvgIcon icon="mdi:scoreboard-outline" class="mr-5px" />
                                            </div>
                                            <NText>
                                                {{ $t('serverJoin.stats.score', { value: player.score }) }}
                                            </NText>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="flex items-center justify-center font-size-16px">
                                                <SvgIcon icon="solar:tag-price-broken" class="mr-5px" />
                                            </div>
                                            <NText>
                                                {{ $t('serverJoin.stats.equipValue', { value: player.equipValue }) }}
                                            </NText>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="flex items-center justify-center font-size-16px">
                                                <SvgIcon icon="hugeicons:gun" class="mr-5px" />
                                            </div>
                                            <NText>
                                                {{ player.weapon?.name || $t('serverJoin.weapon.none') }}
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
    height: 420px;
    padding: 40px 20px 20px 20px;
    gap: 15px;

    .game-join-close {
        position: absolute;
        font-size: 22px;
        top: 8px;
        right: 10px;
        cursor: pointer;
    }

    .game-join-option {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        flex: 1;
        height: 100%;
        background-color: rgba(133, 133, 133, 0.1);
        border-radius: 10px;
        padding: 15px;
    }

    .game-join-person {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        flex: 1;
        height: 100%;
        background-color: rgba(133, 133, 133, 0.1);
        border-radius: 10px;
        padding: 15px;

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
            height: 110px;
            margin-top: 10px;
            margin-bottom: 10px;
            padding: 10px;
            border-radius: 12px;
            background-color: rgba(0, 0, 0, 0.08);
            font-size: 12px;
            font-weight: 700;
            display: flex;
            flex-direction: column;
            gap: 6px;
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
            border: 1px solid rgba(255, 255, 255, 0.08);
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
            border: 1px solid rgba(255, 255, 255, 0.06);
            line-height: 1.2;
        }

        .dynamic-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(0, 249, 26, 1), rgba(84, 112, 238, 1));
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.06);
            flex: 0 0 auto;
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
        background-color: rgba(133, 133, 133, 0.1);
        border-radius: 10px;
        overflow: hidden;

        .server-card {
            position: relative;
            width: 100%;
            background-color: #a5aaa3;
            font-family: 'SimHei';
            overflow: hidden;
            transition: all 0.2s ease;

            .server-card-bg {
                position: absolute;
                width: 100%;
                height: 100%;
                object-fit: cover;
                z-index: 0;
            }

            .server-online {
                height: 4px;
                width: 100%;
                position: absolute;
                z-index: 10;
            }

            .server-card-mask {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                opacity: 1;
            }
        }

        .server-players {
            flex: 1;
            overflow-y: auto;
            padding: 5px 10px 5px 10px;

            .player-info {
                background-color: rgba(133, 133, 133, 0.1);
                border-radius: 8px;
                padding: 10px;
            }
        }
    }
}

.title-container {
    display: flex;
    align-items: center;
    position: relative;

    .setting-icon {
        font-size: 18px;
        animation: rotate 10s linear infinite;
        display: inline-block;
    }

    .title-text {
        display: flex;
        align-items: center;
        height: 100%;
        display: inline-flex;
        letter-spacing: 0.05em;

        .title-char {
            display: inline-block;
        }
    }
}
</style>
