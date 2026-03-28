<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue';
import { NInput, NCollapse, NCollapseItem, NModal, NButton, NSelect } from 'naive-ui';
import { useDebounceFn } from '@vueuse/core';
import { useThemeStore } from '@/store/modules/theme';
import { useGameStore } from '@/store/modules/game';
import { useAuthStore } from '@/store/modules/auth';
import { useDict } from '@/hooks/business/dict';
import { fetchAddMapSubscribe, fetchDeleteMapSubscribe, fetchGetMapPage, fetchGetUserSubscribeList } from '@/service/api/game/map';
import { $t } from '@/locales';
import dayjs from 'dayjs';
import { fetchGetGroupList } from '@/service/api/game/group';
import { fetchBindQQ, fetchBindQQGroup } from '@/service/api/system/user';

defineOptions({
    name: 'MapOrder'
});

/* ================================ Constants ================================ */

const DEBOUNCE_DELAY = 300;
const LOADING_DELAY = 500;
const DEFAULT_PAGE_SIZE = 12;

/* ================================ Composables ================================ */

const themeStore = useThemeStore();
const gameStore = useGameStore();
const authStore = useAuthStore();
const { dictOptions } = useDict();

/* ================================ Emits ================================ */

const emit = defineEmits<{ back: [] }>();

/* ================================ Reactive State ================================ */

const isDarkMode = computed(() => themeStore.darkMode);

const searchKeyword = ref<string>('');
const mapList = ref<Api.Game.MapVo[]>([]);
const subscribeList = ref<Api.Game.MapVo[]>([]);
const mapLoading = ref<boolean>(false);
const subscribeLoading = ref<boolean>(false);
// QQ群配置项
const qqGroupOptions = ref<CommonType.Option<string>[]>([]);

const pagination = reactive<Api.Common.PaginatingCommonParams>({
    current: 1,
    size: DEFAULT_PAGE_SIZE,
    total: 0
});

const subscribedMapIds = computed<Set<number>>(() =>
    new Set(subscribeList.value.map(map => map.id))
);

const getSubscribedMap = (mapId: number) =>
    subscribeList.value.find(map => map.id === mapId);

const isSystemSubscribed = (mapId: number) => {
    const subscribedMap = getSubscribedMap(mapId);
    return subscribedMap?.systemOrder === '1';
};

const isQQSubscribed = (mapId: number) => {
    const subscribedMap = getSubscribedMap(mapId);
    return subscribedMap?.qqOrder === '1';
};

const isCurrentSystemSubscribed = computed(() =>
    currentSubscribeMap.value ? isSystemSubscribed(currentSubscribeMap.value.id) : false
);

const isCurrentQQSubscribed = computed(() =>
    currentSubscribeMap.value ? isQQSubscribed(currentSubscribeMap.value.id) : false
);

const showSubscribeModal = ref<boolean>(false);
const currentSubscribeMap = ref<Api.Game.MapVo | null>(null);

const showBindQQModal = ref<boolean>(false);
const bindQQId = ref<string | null>(null);
const bindQQGroup = ref<string | null>(null);

/* ================================ Event Handlers ================================ */

const handleBack = (): void => emit('back');

const handlePageChange = (page: number): void => {
    pagination.current = page;
    fetchMapList(searchKeyword.value);
};

const handleSubscribe = (map: Api.Game.MapVo): void => {
    currentSubscribeMap.value = map;
    showSubscribeModal.value = true;
};

const handleSystemSubscribe = async (): Promise<void> => {
    if (!currentSubscribeMap.value) return;
    const { error } = await fetchAddMapSubscribe(currentSubscribeMap.value.id, "1", null);
    if (!error) {
        window.$message?.success($t('mapOrder.subscribeSuccess'));
    } else {
        window.$message?.error($t('mapOrder.subscribeFailed'));
    }
    showSubscribeModal.value = false;
    currentSubscribeMap.value = null;
    await fetchSubscribeList();
};

const onGetOption = async () => {
    const { data, error } = await fetchGetGroupList();
    if (!error) {
        qqGroupOptions.value = data;
    }
}

const handleQQSubscribe = async (): Promise<void> => {
    if (!currentSubscribeMap.value) return;

    if (!authStore.userInfo.qqId || !authStore.userInfo.qqgroup) {
        showSubscribeModal.value = false;
        bindQQId.value = authStore.userInfo.qqId;
        bindQQGroup.value = authStore.userInfo.qqgroup;
        showBindQQModal.value = true;
        return;
    }
    const { error } = await fetchAddMapSubscribe(currentSubscribeMap.value.id, null, "1");
    if (!error) {
        window.$message?.success($t('mapOrder.subscribeSuccess'));
    } else {
        window.$message?.error($t('mapOrder.subscribeFailed'));
    }

    showSubscribeModal.value = false;
    currentSubscribeMap.value = null;
    await fetchSubscribeList();
};

const handleBindQQ = async (): Promise<void> => {
    if (!bindQQId.value || !bindQQGroup.value) {
        window.$message?.error($t('mapOrder.qqAndGroupCannotBeEmpty'));
        return;
    }
    const { error } = await fetchBindQQ(bindQQId.value);
    const { error: error2 } = await fetchBindQQGroup(bindQQGroup.value);
    if (!error && !error2) {
        window.$message?.success($t('mapOrder.bindSuccess'));
        await authStore.getUserInfo();
    } else if (error) {
        window.$message?.error(error.message);
    } else if (error2) {
        window.$message?.error(error2.message);
    }
    showBindQQModal.value = false;
};

const handleRemoveSubscribe = async (mapId: number) => {
    const { error } = await fetchDeleteMapSubscribe(mapId);
    if (!error) {
        window.$message?.success($t('mapOrder.unsubscribeSuccess'));
    } else {
        window.$message?.error($t('mapOrder.unsubscribeFailed'));
    }
    await fetchSubscribeList();
};

/* ================================ Data Fetching ================================ */

const fetchMapList = async (keyword: string): Promise<void> => {
    if (!keyword.trim()) {
        mapList.value = [];
        pagination.total = 0;
        return;
    }

    mapLoading.value = true;

    try {
        const { data } = await fetchGetMapPage(pagination, keyword.trim());
        mapList.value = data?.records || [];
        pagination.total = data?.total || 0;
    } catch (error) {
        window.$message?.error($t('mapOrder.searchFailed'));
        console.error('[MapOrder] Failed to fetch map list:', error);
    } finally {
        setTimeout(() => {
            mapLoading.value = false;
        }, LOADING_DELAY);
    }
};

// 获取用户订阅列表
const fetchSubscribeList = async (): Promise<void> => {
    subscribeLoading.value = true;
    try {
        const { data } = await fetchGetUserSubscribeList();
        subscribeList.value = data || [];
    } catch (error) {
        window.$message?.error($t('mapOrder.fetchSubscribeListFailed'));
        console.error('[MapOrder] Failed to fetch subscribe list:', error);
    } finally {
        subscribeLoading.value = false;
    }
};

/* ================================ Utility Functions ================================ */

const isSubscribed = (mapId: number): boolean => subscribedMapIds.value.has(mapId);

const getMapTypeInfo = (mapName: string | undefined): Api.Game.Map | undefined => {
    if (!mapName) return undefined;
    return gameStore.mapList.find(map => map.mapName === mapName);
};

const getMapType = (mapName: string | undefined): string | undefined => getMapTypeInfo(mapName)?.type;

const getMapTags = (mapName: string | undefined): string[] => {
    const mapInfo = getMapTypeInfo(mapName);
    if (!mapInfo?.tag) return [];
    return Array.isArray(mapInfo.tag) ? mapInfo.tag : [mapInfo.tag];
};


const getGameTypeOption = (type: string | undefined) =>
    type ? dictOptions('game_type').find((item: any) => item.value === type) : undefined;

const getGameTagOption = (tag: string | undefined) =>
    tag ? dictOptions('game_tag').find((item: any) => item.value === tag) : undefined;

/* ================================ Watchers ================================ */

const debouncedSearch = useDebounceFn(fetchMapList, DEBOUNCE_DELAY);

watch(searchKeyword, (newValue) => {
    pagination.current = 1;
    debouncedSearch(newValue);
});

/* ================================ Lifecycle ================================ */

onMounted(() => {
    fetchSubscribeList();
    onGetOption();
});
</script>

<template>
    <div class="map-order-container" :class="{ 'light-mode': !isDarkMode }">
        <div class="header-section">
            <div class="title-section">
                <SvgIcon icon="material-symbols:map-outline" />
                <h1 class="page-title">{{ $t('mapOrder.title') }}</h1>
            </div>
            <div class="back-btn" @click="handleBack">
                <SvgIcon icon="material-symbols:arrow-back" class="back-icon" />
                <span>{{ $t('mapOrder.back') }}</span>
            </div>
        </div>
        <div class="main-content">
            <NCard class="left-panel" content-class="h-full overflow-auto" content-style="padding:5px;"
                footer-style="padding:10px">
                <template #header>
                    <div class="search-container">
                        <NInput v-model:value="searchKeyword" type="text"
                            :placeholder="$t('mapOrder.searchPlaceholder')" clearable class="search-input">
                            <template #prefix>
                                <SvgIcon icon="material-symbols:search" class="search-icon" />
                            </template>
                        </NInput>
                    </div>
                </template>
                <NGrid :cols="2" x-gap="10px" y-gap="10px" v-if="!mapLoading">
                    <NGridItem v-for="map in mapList" :key="map.id">
                        <NCard class="map-card" content-style="padding:10px" footer-style="padding: 0px 10px 10px 10px">
                            <div class="map-card-img">
                                <img class="w-full h-full" v-lazy="map.mapUrl" alt="map" />
                            </div>
                            <div class="map-card-info">
                                <div class="map-card-name">{{ map.mapName }}</div>
                                <div class="map-card-label">{{ map.mapLabel }}</div>
                            </div>
                            <div class="flex-y-center mt-5px position-relative font-bold flex-1">
                                <NTag size="small" class="mr-3px rounded-5px" ghost
                                    :type="getGameTypeOption(getMapType(map.mapName))?.type"
                                    v-show="getMapType(map.mapName)">
                                    {{ getGameTypeOption(getMapType(map.mapName))?.label }}
                                </NTag>
                                <NTag v-for="(tag, index) in getMapTags(map.mapName)" :key="index" size="small"
                                    class="mr-3px rounded-5px" type="success" v-show="getMapType(map.mapName)">
                                    {{ getGameTagOption(tag)?.label }}
                                </NTag>
                            </div>
                            <NCollapse v-if="map.exgMap" class="mt-5px">
                                <NCollapseItem :title="$t('mapOrder.mapCD')">
                                    <div class="text-12px">
                                        <div class="flex justify-between">
                                            <span class="color-#999">{{ $t('mapOrder.achievement') }}:</span>
                                            <NTag size="small" class="rounded-5px" type="info">
                                                {{ map.exgMap.achievement10 || '-' }}
                                            </NTag>
                                        </div>
                                        <div class="flex justify-between mt-5px">
                                            <span class="color-#999">{{ $t('mapOrder.lastRun') }}:</span>
                                            <NTag size="small" class="rounded-5px" type="info">
                                                {{ dayjs(map.exgMap.lastRun).format('YYYY-MM-DD HH:mm:ss') || '-'
                                                }}</NTag>
                                        </div>
                                        <div class="flex justify-between mt-5px">
                                            <span class="color-#999">{{ $t('mapOrder.cooldown') }}:</span>
                                            <NTag size="small" class="rounded-5px" type="info">
                                                {{ map.exgMap.cooldownMinute }} {{ $t('mapOrder.minutes') }}</NTag>
                                        </div>
                                        <div class="flex justify-between mt-5px">
                                            <span class="color-#999">{{ $t('mapOrder.deadline') }}:</span>
                                            <NTag size="small" class="rounded-5px" type="info">
                                                {{ dayjs(map.exgMap.deadline).format('YYYY-MM-DD HH:mm:ss') || '-'
                                                }}</NTag>
                                        </div>
                                        <div class="flex justify-between mt-5px">
                                            <span class="color-#999">{{ $t('mapOrder.isOrderable') }}:</span>
                                            <NTag v-if="map.exgMap.isOrder" type="success" size="small"
                                                class="rounded-5px">{{ $t('mapOrder.yes') }}</NTag>
                                            <NTag v-else type="error" size="small" class="rounded-5px">{{ $t('mapOrder.no') }}</NTag>
                                        </div>
                                    </div>
                                </NCollapseItem>
                            </NCollapse>
                            <template #footer>
                                <div class="flex mt-5px">
                                    <NButton v-if="map.isOrder === '1'"
                                        type="info" ghost size="small"
                                        class="w-full rounded-5px" @click="handleSubscribe(map)">
                                        <SvgIcon icon="material-symbols:add" class="mr-3px" />
                                        {{ $t('mapOrder.subscribe') }}
                                    </NButton>
                                    <NButton v-else type="error" ghost size="small" class="w-full rounded-5px"
                                        :disabled="true">
                                        {{ $t('mapOrder.notSubscribable') }}
                                    </NButton>
                                </div>
                            </template>
                        </NCard>
                    </NGridItem>
                </NGrid>
                <LoadingSpinner :loading="mapLoading" v-else="mapLoading" />
                <template #footer>
                    <div class="flex justify-center">
                        <NPagination v-model:value="pagination.current" :total="pagination.total"
                            :item-count="pagination.total" :page-size="pagination.size"
                            @update-page="handlePageChange" />
                    </div>
                </template>
            </NCard>
            <NCard class="right-panel" content-class="h-full overflow-auto" content-style="padding:10px;">
                <template #header>
                    <div class="flex items-center justify-center font-size-16px">
                        <SvgIcon icon="fluent-emoji-high-contrast:package" class="search-icon mr-5px" />
                        {{ $t('mapOrder.subscribeList') }} ({{ subscribeList.length }})
                    </div>
                </template>
                <LoadingSpinner :loading="subscribeLoading" v-if="subscribeLoading" />
                <div v-else-if="subscribeList.length === 0"
                    class="flex flex-col items-center justify-center h-full color-#999">
                    <SvgIcon icon="material-symbols:inbox-outline" class="text-40px mb-10px" />
                    <span class="font-size-14px">{{ $t('mapOrder.noSubscribeData') }}</span>
                </div>
                <div v-else class="subscribe-list">
                    <div v-for="map in subscribeList" :key="map.id" class="subscribe-item">
                        <div class="subscribe-item-img">
                            <img :src="map.mapUrl" :alt="map.mapName" />
                        </div>
                        <div class="subscribe-item-info">
                            <div class="subscribe-item-name">{{ map.mapName }}</div>
                            <div class="subscribe-item-label">{{ map.mapLabel }}</div>
                        </div>
                        <NButton type="error" ghost class="subscribe-item-remove rounded-8px"
                            @click="handleRemoveSubscribe(map.id)">
                            <template #icon>
                                <SvgIcon icon="material-symbols:delete-outline" />
                            </template>
                        </NButton>
                    </div>
                </div>
            </NCard>
        </div>
    </div>

    <NModal v-model:show="showSubscribeModal" :bordered="true" preset="card"
        class="w-400px rounded-20px subscribe-modal-wrapper" :class="{ 'light-mode': !isDarkMode }" :closable="false"
        size="small">
        <template #header>
            <div class="flex items-center font-size-18px">
                <div class="font-size-16px">{{ $t('mapOrder.selectSubscribeType') }}</div>
            </div>
        </template>
        <div class="subscribe-modal-new">
            <div class="subscribe-header">
                <div class="character-image">
                    <img src="@/assets/imgs/tool/3594431.png" alt="character" />
                </div>
                <div class="header-glow"></div>
            </div>
            <div class="subscribe-tips mt-20px">
                <div class="tip-item cursor-pointer" :class="{ 'disabled': isCurrentSystemSubscribed }" @click="!isCurrentSystemSubscribed && handleSystemSubscribe()">
                    <SvgIcon icon="material-symbols:computer" class="tip-icon" />
                    <span class="tip-text">{{ isCurrentSystemSubscribed ? $t('mapOrder.alreadySystemSubscribed') : $t('mapOrder.systemSubscribe') }}</span>
                </div>
                <div class="tip-item cursor-pointer" :class="{ 'disabled': isCurrentQQSubscribed }" @click="!isCurrentQQSubscribed && handleQQSubscribe()">
                    <SvgIcon icon="material-symbols:chat-bubble" class="tip-icon" />
                    <span class="tip-text">{{ isCurrentQQSubscribed ? $t('mapOrder.alreadyQQSubscribed') : $t('mapOrder.qqSubscribe') }}</span>
                </div>
            </div>
        </div>
    </NModal>

    <NModal v-model:show="showBindQQModal" :bordered="true" preset="card"
        class="w-400px rounded-20px bind-qq-modal-wrapper" :class="{ 'light-mode': !isDarkMode }" :closable="false"
        size="small">
        <template #header>
            <div class="flex items-center font-size-18px">
                <div class="font-size-16px">{{ $t('mapOrder.bindQQInfo') }}</div>
            </div>
        </template>
        <div class="bind-qq-modal-new">
            <div class="subscribe-header">
                <div class="character-image">
                    <img src="@/assets/imgs/tool/418392.png" alt="character" />
                </div>
                <div class="header-glow"></div>
            </div>
            <div class="bind-qq-form">
                <div class="form-item">
                    <div class="form-label">{{ $t('mapOrder.qqId') }}</div>
                    <NInput v-model:value="bindQQId" :placeholder="$t('mapOrder.pleaseInputQQId')" class="form-input" />
                </div>
                <div class="form-item">
                    <div class="form-label">{{ $t('mapOrder.qqGroupId') }}</div>
                    <NSelect v-model:value="bindQQGroup" :options="qqGroupOptions" :placeholder="$t('mapOrder.pleaseSelectQQGroup')"
                        class="form-input" clearable />
                </div>
            </div>
            <div class="bind-buttons">
                <NButton type="primary" class="w-full rounded-10px" @click="handleBindQQ">
                    <template #icon>
                        <SvgIcon icon="material-symbols:check" />
                    </template>
                    {{ $t('mapOrder.confirmBind') }}
                </NButton>
            </div>
        </div>
    </NModal>
</template>

<style scoped lang="scss">
.map-order-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    gap: 16px;
    animation: fadeIn 0.4s ease-out;

    .header-section {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;

        .title-section {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 24px;
        }

        .back-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            border-radius: 10px;
            cursor: pointer;
            color: #667eea;
            background: rgba(102, 126, 234, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;

            &:hover {
                color: #667eea;
                background: rgba(102, 126, 234, 0.3);
            }

            .back-icon {
                font-size: 20px;
            }
        }

        .page-title {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
    }

    .main-content {
        display: flex;
        flex: 1;
        gap: 16px;
        min-height: 0;

        .left-panel {
            flex: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 16px;
            border-radius: 5px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;

            .map-card {
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                border-radius: 5px;
                overflow: hidden;

                .map-card-img {
                    width: 100%;
                    object-fit: cover;
                    border-radius: 5px;
                }

                .map-card-info {
                    font-size: 14px;

                    .map-card-name {
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        font-size: 14px;
                        font-weight: bold;
                    }

                    .map-card-label {
                        font-size: 12px;
                        color: #888;
                        font-weight: bold;
                    }
                }
            }

            ::v-deep(.n-card-header) {
                height: 35px;
                padding: 0 0 10px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
        }

        .right-panel {
            width: 300px;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 16px;
            border-radius: 5px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            transition: all 0.3 ease;

            ::v-deep(.n-card-header) {
                height: 35px;
                padding: 0 0 10px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .subscribe-list {
                display: flex;
                flex-direction: column;
                gap: 10px;

                .subscribe-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.3s ease;

                    &:hover {
                        background: rgba(255, 255, 255, 0.1);
                        border-color: rgba(102, 126, 234, 0.3);

                        .subscribe-item-remove {
                            opacity: 1;
                        }
                    }

                    .subscribe-item-img {
                        width: 50px;
                        height: 50px;
                        border-radius: 6px;
                        overflow: hidden;
                        flex-shrink: 0;

                        img {
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        }
                    }

                    .subscribe-item-info {
                        flex: 1;
                        min-width: 0;

                        .subscribe-item-name {
                            font-size: 13px;
                            font-weight: 600;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }

                        .subscribe-item-label {
                            font-size: 11px;
                            color: #888;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }
                    }

                    .subscribe-item-remove {
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }
                }
            }
        }
    }
}

// 浅色模式适配
.light-mode {
    .search-container {
        .search-icon {
            color: rgba(0, 0, 0, 0.4);
        }
    }

    .main-content {
        .left-panel {
            ::v-deep(.n-card-header) {
                border-bottom-color: rgba(0, 0, 0, 0.06);
            }
        }

        .right-panel {
            ::v-deep(.n-card-header) {
                border-bottom-color: rgba(0, 0, 0, 0.06);
            }

            .subscribe-list {
                .subscribe-item {
                    background: rgba(0, 0, 0, 0.02);
                    border-color: rgba(0, 0, 0, 0.08);

                    &:hover {
                        background: rgba(0, 0, 0, 0.05);
                        border-color: rgba(102, 126, 234, 0.3);
                    }
                }
            }
        }
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.subscribe-modal-wrapper {
    :deep(.n-card) {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: none;
        overflow: hidden;
    }

    &.light-mode {
        :deep(.n-card) {
            background: linear-gradient(135deg, #f8f9fc 0%, #eef0f5 100%);
        }

        .subscribe-modal-new {
            display: flex;
            align-items: center;
            color: #333;

            .subscribe-header {
                .character-image {
                    border-color: rgba(102, 126, 234, 0.6);
                    box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
                }

                .header-glow {
                    background: radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, transparent 70%);
                }
            }

            .subscribe-tips {
                .tip-item {
                    background: rgba(102, 126, 234, 0.05);
                    border-color: rgba(102, 126, 234, 0.15);
                    cursor: pointer;

                    &:hover {
                        background: rgba(102, 126, 234, 0.15);
                        border-color: rgba(102, 126, 234, 0.5);
                        box-shadow: 0 0 15px rgba(102, 126, 234, 0.2);
                        transform: translateY(-2px);

                        .tip-icon {
                            color: #764ba2;
                        }

                        .tip-text {
                            color: rgba(0, 0, 0, 0.9);
                        }
                    }

                    .tip-icon {
                        color: #667eea;
                        transition: all 0.3s ease;
                    }

                    .tip-text {
                        color: rgba(0, 0, 0, 0.6);
                        transition: all 0.3s ease;
                    }
                }
            }
        }
    }
}

.subscribe-modal-new {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 0 16px 0;
    color: #fff;
    position: relative;

    .subscribe-header {
        position: relative;
        width: 100%;
        height: 100px;
        display: flex;
        justify-content: center;
        align-items: flex-end;
        margin-bottom: 12px;

        .character-image {
            position: relative;
            z-index: 2;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            overflow: hidden;
            border: 3px solid rgba(102, 126, 234, 0.5);
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
        }

        .header-glow {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 150px;
            height: 150px;
            background: radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%);
            z-index: 1;
        }
    }

    .subscribe-tips {
        display: flex;
        flex-direction: row;
        justify-content: center;
        gap: 12px;
        width: 100%;

        .tip-item {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
            cursor: pointer;

            &.disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background: rgba(100, 100, 100, 0.2);

                &:hover {
                    background: rgba(100, 100, 100, 0.2);
                    border-color: rgba(255, 255, 255, 0.1);
                    box-shadow: none;
                    transform: none;

                    .tip-icon {
                        color: #667eea;
                    }

                    .tip-text {
                        color: rgba(255, 255, 255, 0.8);
                    }
                }
            }

            &:hover {
                background: rgba(102, 126, 234, 0.2);
                border-color: rgba(102, 126, 234, 0.5);
                box-shadow: 0 0 15px rgba(102, 126, 234, 0.3);
                transform: translateY(-2px);

                .tip-icon {
                    color: #764ba2;
                }

                .tip-text {
                    color: #fff;
                }
            }

            .tip-icon {
                font-size: 20px;
                color: #667eea;
                transition: all 0.3s ease;
            }

            .tip-text {
                font-size: 14px;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.8);
                transition: all 0.3s ease;
            }
        }
    }
}

.bind-qq-modal-wrapper {
    :deep(.n-card) {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: none;
        overflow: hidden;
    }

    &.light-mode {
        :deep(.n-card) {
            background: linear-gradient(135deg, #f8f9fc 0%, #eef0f5 100%);
        }

        .bind-qq-modal-new {
            color: #333;

            .subscribe-header {
                .character-image {
                    border-color: rgba(102, 126, 234, 0.6);
                    box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
                }

                .header-glow {
                    background: radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, transparent 70%);
                }
            }

            .bind-qq-form {
                .form-item {
                    .form-label {
                        color: rgba(0, 0, 0, 0.8);
                    }
                }
            }
        }
    }
}

.bind-qq-modal-new {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 0 16px 0;
    color: #fff;
    position: relative;

    .subscribe-header {
        position: relative;
        width: 100%;
        height: 100px;
        display: flex;
        justify-content: center;
        align-items: flex-end;
        margin-bottom: 12px;

        .character-image {
            position: relative;
            z-index: 2;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            overflow: hidden;
            border: 3px solid rgba(102, 126, 234, 0.5);
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
        }

        .header-glow {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 150px;
            height: 150px;
            background: radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%);
            z-index: 1;
        }
    }

    .bind-qq-form {
        width: 100%;
        padding: 0 20px;
        margin-bottom: 16px;

        .form-item {
            margin-bottom: 16px;

            .form-label {
                font-size: 14px;
                font-weight: 500;
                margin-bottom: 8px;
                color: rgba(255, 255, 255, 0.8);
            }

            .form-input {
                width: 100%;
            }
        }
    }

    .bind-buttons {
        width: 100%;
        padding: 0 20px;
    }
}
</style>
