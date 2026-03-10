<script setup lang="ts">
import { useGameStore } from '@/store/modules/game';
import { NModal, NText, NSpace, NTag, NButton, NSwitch, NSlider, NCollapse, NCollapseItem, NAvatar } from 'naive-ui';
import { useDict } from '@/hooks/business/dict';

const props = defineProps<{
    showJoinServer: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:showJoinServer', value: boolean): void;
}>();

const gameStore = useGameStore();
const { dictOptions } = useDict();

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
    if (!team) return '未知';
    switch (team.toLowerCase()) {
        case 'ct': return 'CT';
        case 't': return 'T';
        case 'spectator': return '观察者';
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
    emit('update:showJoinServer', false);
};

//暂停挤服
const startJoinServer = () => {
    gameStore.startAutomaticJoinServer();
};

//暂停挤服
const stopJoinServer = () => {
    gameStore.stopAutomaticJoinServer();
};

// 启动游戏
const handleConfirmOpen = async () => {
    await gameStore.startGame('steamexe');
};
</script>

<template>
    <NModal v-model:show="props.showJoinServer" preset="card" class="w-750px rounded-md flex" size="small"
        :bordered="true" :closable="false" :onMaskClick="handleCancelExit" content-style="padding:0px;">
        <div class="game-join-container">
            <div class="game-join-option" v-if="!gameStore.isAutomatic">
                <div class="title-container mb-10px">
                    <div class="flex items-center font-size-20px">
                        <SvgIcon icon="ic:twotone-settings"></SvgIcon>
                    </div>
                    <h1 class="title-text text-16px font-bold bg-gradient-to-r bg-clip-text text-transparent ml-5px">
                        <NText>
                            挤服设置
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
                                服务器多少人时加入
                            </div>
                        </div>
                        <NTag type="info" ghost size="small" :bordered="false">
                            <div class="font-bold">
                                {{ gameStore.automaticJoinConfig.joinServerPersonValue }}人
                            </div>
                        </NTag>
                    </NSpace>
                    <NSlider v-model:value="gameStore.automaticJoinConfig.joinServerPersonValue" :step="1" :min="1"
                        :max="63" :tooltip="false" />
                    <NSpace justify="space-between">
                        <div class="font-bold font-size-10px">
                            1人
                        </div>
                        <div class="font-bold font-size-10px">
                            63人
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
                                线程数量(推荐设置2)
                            </div>
                        </div>
                        <NTag type="info" ghost size="small" :bordered="false">
                            <div class="font-bold">
                                {{ gameStore.automaticJoinConfig.joinServerCountValue }}个
                            </div>
                        </NTag>
                    </NSpace>
                    <NSlider v-model:value="gameStore.automaticJoinConfig.joinServerCountValue" :step="1" :min="1"
                        :max="6" :tooltip="false" />
                    <NSpace justify="space-between">
                        <div class="font-bold font-size-10px">
                            1个
                        </div>
                        <div class="font-bold font-size-10px">
                            6个
                        </div>
                    </NSpace>
                </div>
                <div class="mb-15px">
                    <NSpace justify="space-between">
                        <div class="flex items-center gap-3px">
                            <div class="font-size-18px">
                                <SvgIcon icon="material-symbols:refresh"></SvgIcon>
                            </div>
                            <div class="font-size-14px font-bold">
                                自动重试
                            </div>
                        </div>
                        <NSwitch v-model:value="gameStore.automaticJoinConfig.joinServerAutoRetryValue"
                            :round="false" />
                    </NSpace>
                </div>
                <NSpace justify="space-between">
                    <NButton type="info" ghost strong class="rounded-6px" v-if="!gameStore.isGameRunning"
                        @click="handleConfirmOpen" :loading="gameStore.isGameLaunching">
                        <template #icon>
                            <SvgIcon icon="hugeicons:start-up-02" />
                        </template>
                        {{ gameStore.isGameLaunching ? '启动中...' : '启动游戏' }}
                    </NButton>
                    <NButton type="success" ghost class="rounded-6px" v-if="gameStore.isGameRunning" :disabled="true">
                        <template #icon>
                            <SvgIcon icon="ix:success-filled" />
                        </template>
                        游戏已启动
                    </NButton>
                    <NButton type="success" ghost strong @click="startJoinServer" class="w-130px rounded-md"
                        :disabled="!gameStore.isGameRunning">
                        <template #icon>
                            <SvgIcon icon="solar:gamepad-broken"></SvgIcon>
                        </template>
                        {{ gameStore.isGameRunning ? '开始挤服' : '请启动游戏' }}
                    </NButton>
                </NSpace>
            </div>
            <div class="game-join-person" v-if="gameStore.isAutomatic">
                <div class="game-join-person-adnimation">

                </div>
                <NSpace justify="space-between">
                    <NButton type="success" ghost class="rounded-6px" v-if="gameStore.isGameRunning" :disabled="true">
                        <template #icon>
                            <SvgIcon icon="ix:success-filled" />
                        </template>
                        游戏已启动
                    </NButton>
                    <NButton type="warning" ghost strong @click="stopJoinServer" class="w-130px rounded-md">
                        <template #icon>
                            <SvgIcon icon="lets-icons:stop"></SvgIcon>
                        </template>
                        暂停挤服
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
                        {{ getMapByMapName(gameStore.joinServerInfo.map)?.mapLabel || '暂无译名' }}
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
                                            <span class="ml-2 font-bold">{{ player.loginUser?.nickName || '未知玩家'
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
                                                {{ player.health }} 生命值
                                            </NText>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="flex items-center justify-center font-size-16px">
                                                <SvgIcon icon="hugeicons:body-armor" class="mr-5px" />
                                            </div>
                                            <NText>
                                                {{
                                                    player.armor }} 护甲
                                            </NText>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="flex items-center justify-center font-size-16px">
                                                <SvgIcon icon="material-symbols:price-change-outline" class="mr-5px" />
                                            </div>
                                            <NText>
                                                {{ player.money }} 金币
                                            </NText>
                                        </div>

                                        <div class="flex items-center">
                                            <div class="flex items-center justify-center font-size-16px">
                                                <SvgIcon icon="ph:knife" class="mr-5px" />
                                            </div>
                                            <NText>
                                                {{ player.kills }} 击杀
                                            </NText>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="flex items-center justify-center font-size-16px">
                                                <SvgIcon icon="mdi:scoreboard-outline" class="mr-5px" />
                                            </div>
                                            <NText>
                                                {{ player.score }} 分
                                            </NText>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="flex items-center justify-center font-size-16px">
                                                <SvgIcon icon="solar:tag-price-broken" class="mr-5px" />
                                            </div>
                                            <NText>
                                                {{ player.equipValue }} 装备价值
                                            </NText>
                                        </div>
                                        <div class="flex items-center">
                                            <div class="flex items-center justify-center font-size-16px">
                                                <SvgIcon icon="hugeicons:gun" class="mr-5px" />
                                            </div>
                                            <NText>
                                                {{ player.weapon.name || '无' }}
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
    display: flex;
    height: 360px;
    padding: 20px;
    gap: 15px;

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