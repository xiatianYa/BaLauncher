<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue';
import { NInput, NModal, NButton, NSelect, NUpload } from 'naive-ui';
import type { UploadCustomRequestOptions } from 'naive-ui';
import { useDebounceFn } from '@vueuse/core';
import { useGameStore } from '@/store/modules/game';
import { useAuth } from '@/hooks/business/auth';
import { useDict } from '@/hooks/business/dict';
import { fetchAddMapSubscribe, fetchDeleteMapSubscribe, fetchGetMapPage, fetchGetUserSubscribeList, fetchUpdateMapSubscribe, fetchUpdateMap, fetchInsertMap, fetchUploadFile } from '@/service/api';
import { $t } from '@/locales';
import dayjs from 'dayjs';
import { useBotBind } from '@/hooks/business/botBind';

defineOptions({ name: 'MapOrder' });

/* ===== 基础配置 ===== */

const DEBOUNCE_DELAY = 300; // 搜索防抖（毫秒）
const LOADING_DELAY = 500; // 列表加载动画时长（毫秒）
const DEFAULT_PAGE_SIZE = 12;

const gameStore = useGameStore();
const { isAdmin } = useAuth();
const { dictOptions } = useDict();
const { ensureBound } = useBotBind(); // 添加订阅时需要先绑定QQ群成员
const emit = defineEmits<{ back: [] }>();
// 地图是否可订阅选项（来自字典 is_order）
const isOrderOptions = computed(() => dictOptions('is_order'));

/* ===== 数据状态 ===== */

const searchKeyword = ref('');
const mapList = ref<Api.Game.MapVo[]>([]);
const subscribeList = ref<Api.Game.MapVo[]>([]);
const mapLoading = ref(false);
const subscribeLoading = ref(false);
const pagination = reactive<Api.Common.PaginatingCommonParams>({ current: 1, size: DEFAULT_PAGE_SIZE, total: 0 });

/* ===== 弹窗状态 ===== */

const showSubscribeModal = ref(false);
const currentSubscribeMap = ref<Api.Game.MapVo | null>(null);
const showEditModal = ref(false);
const currentEditMap = ref<Api.Game.MapVo | null>(null);
const showMapEditModal = ref(false);
const isMapAddMode = ref(false);
const mapEditForm = reactive<Api.Game.MapParams>({ id: 0, mapName: '', mapLabel: '', mapUrl: '', type: '', tag: [], artifact: [], isOrder: '0' });
const mapEditLoading = ref(false);
const mapUploadLoading = ref(false);

/* ===== 订阅状态判断 ===== */

const getSubscribedMap = (mapId: number) => subscribeList.value.find(map => map.id === mapId);
const isSystemSubscribed = (mapId: number) => getSubscribedMap(mapId)?.systemOrder === '1';
const isQQSubscribed = (mapId: number) => getSubscribedMap(mapId)?.qqOrder === '1';
const isCurrentSystemSubscribed = computed(() => (currentSubscribeMap.value ? isSystemSubscribed(currentSubscribeMap.value.id) : false));
const isCurrentQQSubscribed = computed(() => (currentSubscribeMap.value ? isQQSubscribed(currentSubscribeMap.value.id) : false));
const isCurrentEditSystemSubscribed = computed(() => (currentEditMap.value ? isSystemSubscribed(currentEditMap.value.id) : false));
const isCurrentEditQQSubscribed = computed(() => (currentEditMap.value ? isQQSubscribed(currentEditMap.value.id) : false));

/* ===== 订阅编辑 ===== */

const handleEditSubscribe = (map: Api.Game.MapVo) => {
    currentEditMap.value = map;
    showEditModal.value = true;
};

const handleEditSystemSubscribe = async () => {
    if (!currentEditMap.value) return;
    await handleSystemSubscribeDirect(currentEditMap.value);
    showEditModal.value = false;
    currentEditMap.value = null;
};

const handleEditQQSubscribe = async () => {
    if (!currentEditMap.value) return;
    await handleQQSubscribeDirect(currentEditMap.value);
    showEditModal.value = false;
    currentEditMap.value = null;
};

const handleEditUnsubscribeSystem = async () => {
    if (!currentEditMap.value) return;
    await handleUnsubscribeSystem(currentEditMap.value);
};

const handleEditUnsubscribeQQ = async () => {
    if (!currentEditMap.value) return;
    await handleUnsubscribeQQ(currentEditMap.value);
};

const handleDeleteSubscribe = async () => {
    if (!currentEditMap.value) return;
    const { error } = await fetchDeleteMapSubscribe(currentEditMap.value.id);
    if (error) window.$message?.error($t('mapOrder.unsubscribeFailed'));
    showEditModal.value = false;
    currentEditMap.value = null;
    await fetchSubscribeList();
};

/* ===== 地图新增 / 编辑 ===== */

const resetMapEditForm = () => {
    mapEditForm.id = 0;
    mapEditForm.mapName = '';
    mapEditForm.mapLabel = '';
    mapEditForm.mapUrl = '';
    mapEditForm.type = '';
    mapEditForm.tag = [];
    mapEditForm.artifact = [];
    mapEditForm.isOrder = '0';
};

const handleOpenMapAdd = () => {
    resetMapEditForm();
    isMapAddMode.value = true;
    showMapEditModal.value = true;
};

const handleOpenMapEdit = (map: Api.Game.MapVo) => {
    isMapAddMode.value = false;
    mapEditForm.id = map.id;
    mapEditForm.mapName = map.mapName;
    mapEditForm.mapLabel = map.mapLabel;
    mapEditForm.mapUrl = map.mapUrl || '';
    mapEditForm.type = map.type != null ? String(map.type) : '';
    mapEditForm.tag = Array.isArray(map.tag) ? map.tag : (map.tag ? [map.tag] : []);
    mapEditForm.artifact = typeof map.artifact === 'string' ? JSON.parse(map.artifact || '[]') : (map.artifact || []);
    mapEditForm.isOrder = map.isOrder || '0';
    showMapEditModal.value = true;
};

const handleUploadImage = async ({ file, onFinish, onError }: UploadCustomRequestOptions) => {
    mapUploadLoading.value = true;
    try {
        const { data, error } = await fetchUploadFile(file.file as File);
        if (error || !data) {
            window.$message?.error($t('mapOrder.uploadFailed'));
            onError();
            return;
        }
        mapEditForm.mapUrl = data.url;
        window.$message?.success($t('mapOrder.uploadSuccess'));
        onFinish();
    } finally {
        mapUploadLoading.value = false;
    }
};

const handleMapEditSubmit = async () => {
    if (mapEditLoading.value) return;
    mapEditLoading.value = true;
    try {
        const params = { ...mapEditForm, type: mapEditForm.type ? String(mapEditForm.type) : '' };
        const { error } = isMapAddMode.value ? await fetchInsertMap(params) : await fetchUpdateMap(params);
        if (error) {
            window.$message?.error(isMapAddMode.value ? $t('mapOrder.addFailed') : $t('mapOrder.editFailed'));
            return;
        }
        window.$message?.success(isMapAddMode.value ? $t('mapOrder.addSuccess') : $t('mapOrder.editSuccess'));
        showMapEditModal.value = false;
        // 等待编辑完成后再刷新地图列表
        await fetchMapList(searchKeyword.value);
        await gameStore.initServerList();
    } finally {
        mapEditLoading.value = false;
    }
};

/* ===== 订阅操作 ===== */

const handleBack = () => emit('back');

const handlePageChange = (page: number) => {
    pagination.current = page;
    fetchMapList(searchKeyword.value);
};

const handleSystemSubscribe = async () => {
    if (!currentSubscribeMap.value) return;
    // 添加订阅前需先绑定QQ群成员，未绑定则弹出绑定模态框
    const bound = await ensureBound();
    if (!bound) return;
    const { error } = await fetchAddMapSubscribe(currentSubscribeMap.value.id, '1', null);
    if (error) {
        console.error('[mapOrder] 系统订阅失败:', error);
        window.$message?.error(error.message || $t('mapOrder.subscribeFailed'));
    }
    showSubscribeModal.value = false;
    currentSubscribeMap.value = null;
    await fetchSubscribeList();
};

const handleQQSubscribe = async () => {
    if (!currentSubscribeMap.value) return;
    // 添加订阅前需先绑定QQ群成员，未绑定则弹出绑定模态框
    const bound = await ensureBound();
    if (!bound) return;
    const { error } = await fetchAddMapSubscribe(currentSubscribeMap.value.id, null, '1');
    if (error) {
        console.error('[mapOrder] QQ订阅失败:', error);
        window.$message?.error(error.message || $t('mapOrder.subscribeFailed'));
    }
    showSubscribeModal.value = false;
    currentSubscribeMap.value = null;
    await fetchSubscribeList();
};

const handleSystemSubscribeDirect = async (map: Api.Game.MapVo) => {
    // 添加订阅前需先绑定QQ群成员，未绑定则弹出绑定模态框
    const bound = await ensureBound();
    if (!bound) return;
    const { error } = await fetchAddMapSubscribe(map.id, '1', null);
    if (error) {
        console.error('[mapOrder] 系统订阅失败:', error);
        window.$message?.error(error.message || $t('mapOrder.subscribeFailed'));
    }
    await fetchSubscribeList();
};

const handleQQSubscribeDirect = async (map: Api.Game.MapVo) => {
    // 添加订阅前需先绑定QQ群成员，未绑定则弹出绑定模态框
    const bound = await ensureBound();
    if (!bound) return;
    const { error } = await fetchAddMapSubscribe(map.id, null, '1');
    if (error) {
        console.error('[mapOrder] QQ订阅失败:', error);
        window.$message?.error(error.message || $t('mapOrder.subscribeFailed'));
    }
    await fetchSubscribeList();
};

const handleUnsubscribe = async (map: Api.Game.MapVo, systemOrder: string | null, qqOrder: string | null) => {
    const { error } = await fetchUpdateMapSubscribe({ mapId: map.id, systemOrder, qqOrder });
    if (error) window.$message?.error($t('mapOrder.unsubscribeFailed'));
    await fetchSubscribeList();
    if (showEditModal.value && currentEditMap.value?.id === map.id) {
        showEditModal.value = false;
        currentEditMap.value = null;
    }
};

const handleUnsubscribeSystem = (map: Api.Game.MapVo) => handleUnsubscribe(map, '0', null);
const handleUnsubscribeQQ = (map: Api.Game.MapVo) => handleUnsubscribe(map, null, '0');

/* ===== 数据请求 ===== */

const fetchMapList = async (keyword: string) => {
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

const fetchSubscribeList = async () => {
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

/* ===== 工具函数 ===== */

const getMapTypeInfo = (mapName?: string) => (mapName ? gameStore.mapList.find(map => map.mapName === mapName) : undefined);
const getMapType = (mapName?: string) => getMapTypeInfo(mapName)?.type;
const getMapTags = (mapName?: string) => {
    const tags = getMapTypeInfo(mapName)?.tag;
    return tags ? (Array.isArray(tags) ? tags : [tags]) : [];
};
const getGameTypeOption = (type?: string) => (type ? dictOptions('game_type').find(item => item.value === type) : undefined);
const getGameTagOption = (tag?: string) => (tag ? dictOptions('game_tag').find(item => item.value === tag) : undefined);

/* ===== 搜索监听 ===== */

const debouncedSearch = useDebounceFn(fetchMapList, DEBOUNCE_DELAY);

watch(searchKeyword, (value) => {
    pagination.current = 1;
    debouncedSearch(value);
});

/* ===== 初始化 ===== */

onMounted(() => {
    fetchMapList('');
    fetchSubscribeList();
});
</script>

<template>
    <div class="map-order-container">
        <div class="header-section">
            <div class="title-section">
                <SvgIcon icon="material-symbols:map-outline" />
                <h1 class="page-title">{{ $t('mapOrder.title') }}</h1>
            </div>
            <div class="header-actions">
                <div v-if="isAdmin" class="add-map-btn" @click="handleOpenMapAdd">
                    <SvgIcon icon="material-symbols:add" class="add-icon" />
                    <span>{{ $t('mapOrder.addMap') }}</span>
                </div>
                <div class="back-btn" @click="handleBack">
                    <SvgIcon icon="material-symbols:arrow-back" class="back-icon" />
                    <span>{{ $t('mapOrder.back') }}</span>
                </div>
            </div>
        </div>
        <div class="main-content">
            <NCard class="left-panel" content-class="h-full overflow-auto" content-style="padding:5px;"
                footer-style="padding:10px">
                <template #header>
                    <div class="search-container">
                        <div class="search-box">
                            <SvgIcon icon="material-symbols:search" class="search-icon" />
                            <NInput v-model:value="searchKeyword" type="text"
                                :placeholder="$t('mapOrder.searchPlaceholder')" clearable class="search-input" />
                        </div>
                    </div>
                </template>
                <NGrid :cols="2" x-gap="12px" y-gap="12px" v-if="!mapLoading">
                    <NGridItem v-for="map in mapList" :key="map.id">
                        <div class="map-card">
                            <div class="map-card-img">
                                <img v-lazy="map.mapUrl" alt="map" />
                                <div class="map-card-overlay">
                                    <div class="map-card-tags">
                                        <span v-if="getMapType(map.mapName)" class="map-type-tag"
                                            :class="'type-' + getGameTypeOption(getMapType(map.mapName))?.type">
                                            {{ getGameTypeOption(getMapType(map.mapName))?.label }}
                                        </span>
                                        <span v-for="(tag, index) in getMapTags(map.mapName)" :key="index"
                                            class="map-tag">
                                            {{ getGameTagOption(tag)?.label }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div class="map-card-content">
                                <div class="map-card-info">
                                    <div class="map-card-name">{{ map.mapName }}</div>
                                    <div class="map-card-label">{{ map.mapLabel }}</div>
                                </div>
                                <div class="map-card-stats">
                                    <div class="stat-item">
                                        <span class="stat-label">{{ $t('mapOrder.achievement') }}</span>
                                        <span class="stat-value">{{ map.exgMap?.achievement10 || '-' }}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">{{ $t('mapOrder.cooldown') }}</span>
                                        <span class="stat-value">{{ map.exgMap?.cooldownMinute || '-' }} {{
                                            $t('mapOrder.minutes')
                                            }}</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">{{ $t('mapOrder.isOrderable') }}</span>
                                        <span class="stat-value"
                                            :class="{ 'is-order': map.exgMap?.isOrder, 'not-order': !map.exgMap?.isOrder }">
                                            {{ map.exgMap?.isOrder ? $t('mapOrder.yes') : $t('mapOrder.no') }}
                                        </span>
                                    </div>
                                </div>
                                <div class="map-card-actions">
                                    <template v-if="map.isOrder === '1'">
                                        <div v-if="!isSystemSubscribed(map.id)" class="action-btn system"
                                            @click="handleSystemSubscribeDirect(map)">
                                            <SvgIcon icon="tabler:device-desktop" />
                                            <span>{{ $t('mapOrder.systemSubscribe') }}</span>
                                        </div>
                                        <div v-else class="action-btn system subscribed"
                                            @click="handleUnsubscribeSystem(map)">
                                            <SvgIcon icon="tabler:device-desktop" />
                                            <span>{{ $t('mapOrder.unsubscribeSystem') }}</span>
                                        </div>
                                        <div v-if="!isQQSubscribed(map.id)" class="action-btn qq"
                                            @click="handleQQSubscribeDirect(map)">
                                            <SvgIcon icon="basil:qq-outline" />
                                            <span>{{ $t('mapOrder.qqSubscribe') }}</span>
                                        </div>
                                        <div v-else class="action-btn qq subscribed" @click="handleUnsubscribeQQ(map)">
                                            <SvgIcon icon="basil:qq-outline" />
                                            <span>{{ $t('mapOrder.unsubscribeQQ') }}</span>
                                        </div>
                                    </template>
                                    <div v-else class="action-btn disabled">
                                        <span>{{ $t('mapOrder.notSubscribable') }}</span>
                                    </div>
                                    <div v-if="isAdmin" class="action-btn edit" @click="handleOpenMapEdit(map)">
                                        <SvgIcon icon="material-symbols:edit-outline" />
                                        <span>{{ $t('mapOrder.editMap') }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
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
                    <div class="subscribe-list-title">
                        <SvgIcon icon="fluent-emoji-high-contrast:package" class="subscribe-list-icon" />
                        <span>{{ $t('mapOrder.subscribeList') }}</span>
                    </div>
                </template>
                <!-- 订阅列表骨架屏 -->
                <div v-if="subscribeLoading" class="subscribe-skeleton-list">
                    <div v-for="i in 4" :key="`subscribe-skeleton-${i}`" class="subscribe-skeleton-item">
                        <div class="subscribe-skeleton-img" />
                        <div class="subscribe-skeleton-content">
                            <div class="subscribe-skeleton-title" />
                            <div class="subscribe-skeleton-line short" />
                            <div class="subscribe-skeleton-line" />
                            <div class="subscribe-skeleton-line short" />
                        </div>
                    </div>
                </div>
                <div v-else-if="subscribeList.length === 0"
                    class="flex flex-col items-center justify-center h-full color-#999">
                    <SvgIcon icon="material-symbols:inbox-outline" class="text-40px mb-10px" />
                    <span class="font-size-14px">{{ $t('mapOrder.noSubscribeData') }}</span>
                </div>
                <div v-else class="subscribe-list">
                    <div v-for="map in subscribeList" :key="map.id" class="subscribe-item">
                        <div class="subscribe-item-main">
                            <div class="subscribe-item-img">
                                <img :src="map.mapUrl" :alt="map.mapName" />
                            </div>
                            <div class="subscribe-item-content">
                                <div class="subscribe-item-title-row">
                                    <div class="subscribe-item-name">{{ map.mapName }}</div>
                                    <div class="subscribe-item-actions">
                                        <div class="icon-btn edit-btn" @click="handleEditSubscribe(map)">
                                            <SvgIcon icon="material-symbols:left-panel-open-outline" />
                                        </div>
                                    </div>
                                </div>
                                <div class="subscribe-item-label">{{ map.mapLabel }}</div>
                                <div class="subscribe-item-meta">
                                    <div class="meta-item">
                                        <span class="meta-label">{{ $t('mapOrder.achievement') }}</span>
                                        <span class="meta-value">{{ map.exgMap.achievement10 || '-' }}</span>
                                    </div>
                                    <div class="meta-item">
                                        <span class="meta-label">{{ $t('mapOrder.cooldown') }}</span>
                                        <span class="meta-value">{{ map.exgMap.cooldownMinute }} {{
                                            $t('mapOrder.minutes') }}</span>
                                    </div>
                                    <div class="meta-item">
                                        <span class="meta-label">{{ $t('mapOrder.isOrderable') }}</span>
                                        <span class="meta-value"
                                            :class="{ 'is-order': map.exgMap?.isOrder, 'not-order': !map.exgMap?.isOrder }">
                                            {{ map.exgMap?.isOrder ? $t('mapOrder.yes') : $t('mapOrder.no') }}
                                        </span>
                                    </div>
                                </div>
                                <div class="subscribe-item-extra">
                                    <div class="extra-item">
                                        <span class="extra-label">{{ $t('mapOrder.lastRun') }}:</span>
                                        <span class="extra-value">{{ dayjs(map.exgMap.lastRun).format('YYYY-MM-DD HH:mm:ss') || '-' }}</span>
                                    </div>
                                    <div class="extra-item">
                                        <span class="extra-label">{{ $t('mapOrder.deadline') }}:</span>
                                        <span class="extra-value">{{ dayjs(map.exgMap.deadline).format('YYYY-MM-DD HH:mm:ss') || '-' }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </NCard>
        </div>
    </div>
    <NModal v-model:show="showSubscribeModal" :bordered="true" preset="card"
        class="w-400px rounded-20px subscribe-modal-wrapper" :closable="false" size="small">
        <template #header>
            <div class="flex items-center font-size-18px">
                <div class="font-size-16px">{{ $t('mapOrder.selectSubscribeType') }}</div>
            </div>
        </template>
        <div class="subscribe-modal-new">
            <div class="subscribe-header">
                <div class="character-image">
                    <img src="@/assets/imgs/tool/character.png" alt="character" />
                </div>
                <div class="header-glow"></div>
            </div>
            <div class="subscribe-tips mt-20px">
                <div class="tip-item cursor-pointer" :class="{ 'disabled': isCurrentSystemSubscribed }"
                    @click="!isCurrentSystemSubscribed && handleSystemSubscribe()">
                    <SvgIcon icon="tabler:device-desktop" class="tip-icon" />
                    <span class="tip-text">{{ isCurrentSystemSubscribed ? $t('mapOrder.alreadySystemSubscribed') :
                        $t('mapOrder.systemSubscribe') }}</span>
                </div>
                <div class="tip-item cursor-pointer" :class="{ 'disabled': isCurrentQQSubscribed }"
                    @click="!isCurrentQQSubscribed && handleQQSubscribe()">
                    <SvgIcon icon="basil:qq-outline" class="tip-icon" />
                    <span class="tip-text">{{ isCurrentQQSubscribed ? $t('mapOrder.alreadyQQSubscribed') :
                        $t('mapOrder.qqSubscribe') }}</span>
                </div>
            </div>
        </div>
    </NModal>
    <NModal v-model:show="showEditModal" :bordered="true" preset="card"
        class="w-400px rounded-20px subscribe-modal-wrapper" :closable="false" size="small">
        <template #header>
            <div class="font-size-16px">{{ $t('mapOrder.editSubscribe') }}</div>
        </template>
        <template #header-extra>
            <NButton quaternary size="tiny" @click="showEditModal = false">
                <SvgIcon icon="material-symbols:close" />
            </NButton>
        </template>
        <div class="subscribe-modal-new pt-20px pb-20px pl-20px pr-20px">
            <div class="subscribe-header mb-20px">
                <div class="character-image">
                    <img src="@/assets/imgs/tool/character.png" alt="character" />
                </div>
                <div class="header-glow"></div>
            </div>
            <div class="edit-map-name text-18px font-bold mb-20px text-center">
                {{ currentEditMap?.mapName }}
            </div>
            <div class="edit-actions">
                <div v-if="!isCurrentEditSystemSubscribed" class="action-card system-card"
                    @click="handleEditSystemSubscribe()">
                    <SvgIcon icon="tabler:device-desktop" class="action-icon" />
                    <span class="action-text">{{ $t('mapOrder.systemSubscribe') }}</span>
                </div>
                <div v-else class="action-card system-card subscribed" @click="handleEditUnsubscribeSystem()">
                    <SvgIcon icon="tabler:device-desktop" class="action-icon" />
                    <span class="action-text">{{ $t('mapOrder.unsubscribeSystem') }}</span>
                </div>
                <div v-if="!isCurrentEditQQSubscribed" class="action-card qq-card" @click="handleEditQQSubscribe()">
                    <SvgIcon icon="basil:qq-outline" class="action-icon" />
                    <span class="action-text">{{ $t('mapOrder.qqSubscribe') }}</span>
                </div>
                <div v-else class="action-card qq-card subscribed" @click="handleEditUnsubscribeQQ()">
                    <SvgIcon icon="basil:qq-outline" class="action-icon" />
                    <span class="action-text">{{ $t('mapOrder.unsubscribeQQ') }}</span>
                </div>
                <div class="action-card delete-card" @click="handleDeleteSubscribe">
                    <SvgIcon icon="material-symbols:delete-outline" class="action-icon" />
                    <span class="action-text">{{ $t('mapOrder.deleteSubscribe') }}</span>
                </div>
            </div>
        </div>
    </NModal>
    <NModal v-model:show="showMapEditModal" :bordered="true" preset="card" class="w-500px rounded-20px" :closable="true"
        size="small">
        <template #header>
            <div class="flex items-center font-size-16px">
                <SvgIcon :icon="isMapAddMode ? 'material-symbols:add' : 'material-symbols:edit-outline'"
                    class="mr-5px" />
                {{ isMapAddMode ? $t('mapOrder.addMap') : $t('mapOrder.editMap') }}
            </div>
        </template>
        <div class="map-edit-form p-10px">
            <div class="form-item mb-10px">
                <div class="form-label mb-5px font-bold">{{ $t('mapOrder.mapImage') }}</div>
                <NUpload accept="image/*" :max="1" :show-file-list="false" :custom-request="handleUploadImage">
                    <div class="map-upload-trigger">
                        <img v-if="mapEditForm.mapUrl" :src="mapEditForm.mapUrl" class="map-upload-preview" alt="map" />
                        <div v-else class="map-upload-placeholder">
                            <SvgIcon icon="material-symbols:add-photo-alternate-outline" class="placeholder-icon" />
                            <span>{{ mapUploadLoading ? $t('mapOrder.uploading') : $t('mapOrder.uploadMapImage')
                                }}</span>
                        </div>
                    </div>
                </NUpload>
            </div>
            <div class="form-item mb-10px">
                <div class="form-label mb-5px font-bold">{{ $t('mapOrder.mapName') }}</div>
                <NInput v-model:value="mapEditForm.mapName" :placeholder="$t('mapOrder.mapName')" />
            </div>
            <div class="form-item mb-10px">
                <div class="form-label mb-5px font-bold">{{ $t('mapOrder.mapLabel') }}</div>
                <NInput v-model:value="mapEditForm.mapLabel" :placeholder="$t('mapOrder.mapLabel')" />
            </div>
            <div class="form-item mb-10px">
                <div class="form-label mb-5px font-bold">{{ $t('mapOrder.mapType') }}</div>
                <NSelect v-model:value="mapEditForm.type" :options="dictOptions('game_type')" clearable
                    :placeholder="$t('mapOrder.mapType')" />
            </div>
            <div class="form-item mb-10px">
                <div class="form-label mb-5px font-bold">{{ $t('mapOrder.mapTag') }}</div>
                <NSelect v-model:value="mapEditForm.tag" :options="dictOptions('game_tag')" multiple clearable
                    :placeholder="$t('mapOrder.mapTag')" />
            </div>
            <div class="form-item mb-10px">
                <div class="form-label mb-5px font-bold">{{ $t('mapOrder.isOrder') }}</div>
                <NSelect v-model:value="mapEditForm.isOrder" :options="isOrderOptions" clearable
                    :placeholder="$t('mapOrder.isOrder')" />
            </div>
            <div class="flex gap-10px mt-15px">
                <NButton type="primary" class="flex-1 rounded-5px" :loading="mapEditLoading"
                    @click="handleMapEditSubmit">
                    <template #icon>
                        <SvgIcon icon="material-symbols:check" />
                    </template>
                    {{ $t('mapOrder.confirm') }}
                </NButton>
                <NButton class="flex-1 rounded-5px" @click="showMapEditModal = false">
                    <template #icon>
                        <SvgIcon icon="material-symbols:close" />
                    </template>
                    {{ $t('mapOrder.cancel') }}
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

        .header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .add-map-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 9px 18px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s ease;
            color: #667eea;
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.25);

            &:hover {
                background: rgba(102, 126, 234, 0.18);
                border-color: rgba(102, 126, 234, 0.4);
            }

            .add-icon {
                font-size: 18px;
            }
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
            border: 1px solid rgba(var(--app-rgb), 0.1);
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
            color: var(--n-text-color);
            letter-spacing: 0.5px;
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
                height: 100%;
                background: rgba(var(--app-rgb), 0.04);
                border: 1px solid rgba(var(--app-rgb), 0.08);
                border-radius: 14px;
                overflow: hidden;
                transition: all 0.25s ease;

                &:hover {
                    background: rgba(var(--app-rgb), 0.07);
                    border-color: rgba(102, 126, 234, 0.35);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);

                    .map-card-img img {
                        transform: scale(1.05);
                    }
                }

                .map-card-img {
                    position: relative;
                    width: 100%;
                    height: 120px;
                    overflow: hidden;

                    img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        transition: transform 0.3s ease;
                    }

                    .map-card-overlay {
                        position: absolute;
                        inset: 0;
                        background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 55%);
                        display: flex;
                        align-items: flex-end;
                        padding: 10px;
                        pointer-events: none;

                        .map-card-tags {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 5px;

                            .map-type-tag,
                            .map-tag {
                                padding: 2px 7px;
                                border-radius: 5px;
                                font-size: 10px;
                                font-weight: 500;
                                color: #fff;
                                background: rgba(var(--app-rgb), 0.15);
                                border: 1px solid rgba(var(--app-rgb), 0.2);
                                backdrop-filter: blur(4px);
                            }

                            .map-type-tag {
                                &.type-info {
                                    background: rgba(112, 192, 232, 0.35);
                                    border-color: rgba(112, 192, 232, 0.55);
                                }

                                &.type-success {
                                    background: rgba(99, 226, 183, 0.35);
                                    border-color: rgba(99, 226, 183, 0.55);
                                }

                                &.type-warning {
                                    background: rgba(240, 160, 32, 0.35);
                                    border-color: rgba(240, 160, 32, 0.55);
                                }

                                &.type-error {
                                    background: rgba(232, 128, 128, 0.35);
                                    border-color: rgba(232, 128, 128, 0.55);
                                }
                            }

                            .map-tag {
                                background: rgba(99, 226, 183, 0.3);
                                border-color: rgba(99, 226, 183, 0.45);
                            }
                        }
                    }
                }

                .map-card-content {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    padding: 12px;
                    flex: 1;
                }

                .map-card-info {
                    .map-card-name {
                        font-size: 14px;
                        font-weight: 600;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .map-card-label {
                        font-size: 11px;
                        color: rgba(var(--app-rgb), 0.45);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                }

                .map-card-stats {
                    display: flex;
                    gap: 6px;

                    .stat-item {
                        display: flex;
                        align-items: center;
                        gap: 3px;
                        padding: 2px 7px;
                        border-radius: 6px;
                        background: rgba(var(--app-rgb), 0.05);
                        font-size: 10px;

                        .stat-label {
                            color: rgba(var(--app-rgb), 0.4);
                        }

                        .stat-value {
                            color: rgba(var(--app-rgb), 0.8);
                            font-weight: 500;

                            &.is-order {
                                color: #63e2b7;
                            }

                            &.not-order {
                                color: #e88080;
                            }
                        }
                    }
                }

                .map-card-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: auto;

                    .action-btn {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 4px;
                        flex: 1;
                        min-width: 0;
                        height: 30px;
                        padding: 0 8px;
                        border-radius: 8px;
                        cursor: pointer;
                        pointer-events: auto;
                        font-size: 11px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                        border: 1px solid transparent;
                        user-select: none;

                        svg {
                            font-size: 14px;
                            flex-shrink: 0;
                        }

                        span {
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }

                        &.system {
                            color: #70c0e8;
                            background: rgba(112, 192, 232, 0.08);
                            border-color: rgba(112, 192, 232, 0.2);

                            &:hover {
                                background: rgba(112, 192, 232, 0.15);
                                border-color: rgba(112, 192, 232, 0.35);
                            }

                            &.subscribed {
                                color: #fff;
                                background: #70c0e8;
                                border-color: #70c0e8;
                            }
                        }

                        &.qq {
                            color: #63e2b7;
                            background: rgba(99, 226, 183, 0.08);
                            border-color: rgba(99, 226, 183, 0.2);

                            &:hover {
                                background: rgba(99, 226, 183, 0.15);
                                border-color: rgba(99, 226, 183, 0.35);
                            }

                            &.subscribed {
                                color: #fff;
                                background: #63e2b7;
                                border-color: #63e2b7;
                            }
                        }

                        &.edit {
                            width: 100%;
                            flex: none;
                            color: #f0a020;
                            background: rgba(240, 160, 32, 0.08);
                            border-color: rgba(240, 160, 32, 0.2);

                            &:hover {
                                background: rgba(240, 160, 32, 0.15);
                                border-color: rgba(240, 160, 32, 0.35);
                            }
                        }

                        &.disabled {
                            width: 100%;
                            flex: none;
                            color: rgba(var(--app-rgb), 0.4);
                            background: rgba(var(--app-rgb), 0.05);
                            border-color: rgba(var(--app-rgb), 0.1);
                            cursor: not-allowed;
                        }
                    }
                }
            }

            ::v-deep(.n-card-header) {
                height: auto;
                padding: 2px 0 12px;
                border-bottom: 1px solid rgba(var(--app-rgb), 0.1);
            }
        }

        .right-panel {
            width: 450px;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 16px;
            border-radius: 5px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            transition: all 0.3 ease;

            ::v-deep(.n-card-header) {
                height: auto;
                padding: 2px 0 12px;
                border-bottom: 1px solid rgba(var(--app-rgb), 0.1);
            }

            .subscribe-list {
                display: flex;
                flex-direction: column;
                gap: 12px;

                .subscribe-item {
                    background: rgba(var(--app-rgb), 0.04);
                    border: 1px solid rgba(var(--app-rgb), 0.08);
                    border-radius: 14px;
                    padding: 12px;
                    transition: all 0.25s ease;

                    &:hover {
                        background: rgba(var(--app-rgb), 0.07);
                        border-color: rgba(102, 126, 234, 0.35);
                        transform: translateY(-2px);
                        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
                    }

                    .subscribe-item-main {
                        display: flex;
                        gap: 12px;
                    }

                    .subscribe-item-img {
                        width: 60px;
                        height: 60px;
                        border-radius: 10px;
                        overflow: hidden;
                        flex-shrink: 0;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

                        img {
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        }
                    }

                    .subscribe-item-content {
                        flex: 1;
                        min-width: 0;
                        display: flex;
                        flex-direction: column;
                        gap: 5px;
                    }

                    .subscribe-item-title-row {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 8px;
                    }

                    .subscribe-item-name {
                        font-size: 14px;
                        font-weight: 600;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .subscribe-item-actions {
                        display: flex;
                        gap: 6px;

                        .icon-btn {
                            width: 26px;
                            height: 26px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 7px;
                            cursor: pointer;
                            pointer-events: auto;
                            color: rgba(var(--app-rgb), 0.65);
                            background: rgba(var(--app-rgb), 0.06);
                            border: 1px solid rgba(var(--app-rgb), 0.1);
                            transition: all 0.2s ease;

                            &:hover {
                                background: rgba(102, 126, 234, 0.15);
                                border-color: rgba(102, 126, 234, 0.4);
                                color: #667eea;
                            }
                        }
                    }

                    .subscribe-item-label {
                        font-size: 11px;
                        color: rgba(var(--app-rgb), 0.45);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .subscribe-item-meta {
                        display: flex;
                        gap: 6px;
                        margin-top: 2px;

                        .meta-item {
                            display: flex;
                            align-items: center;
                            gap: 3px;
                            padding: 2px 7px;
                            border-radius: 6px;
                            background: rgba(var(--app-rgb), 0.05);
                            font-size: 10px;

                            .meta-label {
                                color: rgba(var(--app-rgb), 0.4);
                            }

                            .meta-value {
                                color: rgba(var(--app-rgb), 0.8);
                                font-weight: 500;

                                &.is-order {
                                    color: #63e2b7;
                                }

                                &.not-order {
                                    color: #e88080;
                                }
                            }
                        }
                    }

                    .subscribe-item-extra {
                        display: flex;
                        flex-direction: column;
                        gap: 2px;
                        margin-top: 2px;

                        .extra-item {
                            display: flex;
                            align-items: center;
                            gap: 5px;
                            font-size: 10px;

                            .extra-label {
                                color: rgba(var(--app-rgb), 0.4);
                                flex-shrink: 0;
                            }

                            .extra-value {
                                color: rgba(var(--app-rgb), 0.65);
                                white-space: nowrap;
                                overflow: hidden;
                                text-overflow: ellipsis;
                            }
                        }
                    }
                }
            }
        }
    }
}

/* ==================== 搜索框 ==================== */
.search-container {
    width: 100%;
    padding: 2px 0;

    .search-box {
        position: relative;
        display: flex;
        align-items: center;
        height: 36px;
        padding: 0 10px 0 36px;
        border-radius: 18px;
        background: rgba(var(--app-rgb), 0.05);
        border: 1px solid rgba(var(--app-rgb), 0.09);
        transition: all 0.25s ease;

        &:focus-within {
            border-color: rgba(102, 126, 234, 0.55);
            background: rgba(var(--app-rgb), 0.08);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.12);
        }

        .search-icon {
            position: absolute;
            left: 12px;
            font-size: 17px;
            color: rgba(102, 126, 234, 0.8);
            transition: color 0.25s ease;
        }

        &:focus-within .search-icon {
            color: rgba(102, 126, 234, 1);
        }

        ::v-deep(.n-input) {
            background: transparent;
            --n-border: none !important;
            --n-border-focus: none !important;
            --n-border-hover: none !important;
            --n-box-shadow-focus: none !important;

            .n-input__input-el {
                color: rgba(var(--app-rgb), 0.9);
                font-size: 13px;
            }

            .n-input__placeholder {
                color: rgba(var(--app-rgb), 0.35);
            }
        }
    }
}

/* ==================== 订阅列表标题 ==================== */
.subscribe-list-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: rgba(var(--app-rgb), 0.9);

    .subscribe-list-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 9px;
        background: rgba(102, 126, 234, 0.16);
        border: 1px solid rgba(102, 126, 234, 0.25);
        color: rgba(102, 126, 234, 0.95);
        font-size: 15px;
        transition: all 0.25s ease;
    }
}

/* ==================== 订阅列表骨架屏（参考 userManage/roleManage shimmer 风格） ==================== */
.subscribe-skeleton-list {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .subscribe-skeleton-item {
        display: flex;
        gap: 12px;
        padding: 12px;
        background: rgba(var(--app-rgb), 0.04);
        border: 1px solid rgba(var(--app-rgb), 0.08);
        border-radius: 14px;

        .subscribe-skeleton-img,
        .subscribe-skeleton-title,
        .subscribe-skeleton-line {
            background: linear-gradient(90deg,
                    rgba(var(--app-rgb), 0.04) 25%,
                    rgba(var(--app-rgb), 0.09) 50%,
                    rgba(var(--app-rgb), 0.04) 75%);
            background-size: 200% 100%;
            animation: subscribeShimmer 1.5s infinite;
        }

        .subscribe-skeleton-img {
            width: 60px;
            height: 60px;
            border-radius: 10px;
            flex-shrink: 0;
        }

        .subscribe-skeleton-content {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
            justify-content: center;

            .subscribe-skeleton-title {
                height: 14px;
                width: 60%;
                border-radius: 6px;
            }

            .subscribe-skeleton-line {
                height: 12px;
                width: 100%;
                border-radius: 6px;

                &.short {
                    width: 50%;
                }
            }
        }
    }
}

@keyframes subscribeShimmer {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
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

    .edit-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        width: 100%;

        .action-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 90px;
            height: 75px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.2s ease;
            cursor: pointer;
            pointer-events: auto;
            gap: 6px;
            user-select: none;

            &:hover {
                transform: translateY(-2px);
            }

            .action-icon {
                font-size: 22px;
            }

            .action-text {
                font-size: 11px;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.7);
                text-align: center;
                line-height: 1.2;
            }
        }

        .system-card {
            color: #70c0e8;

            &:hover {
                background: rgba(112, 192, 232, 0.1);
                border-color: rgba(112, 192, 232, 0.3);
            }

            &.subscribed {
                background: rgba(112, 192, 232, 0.15);
                border-color: rgba(112, 192, 232, 0.4);
            }
        }

        .qq-card {
            color: #63e2b7;

            &:hover {
                background: rgba(99, 226, 183, 0.1);
                border-color: rgba(99, 226, 183, 0.3);
            }

            &.subscribed {
                background: rgba(99, 226, 183, 0.15);
                border-color: rgba(99, 226, 183, 0.4);
            }
        }

        .delete-card {
            color: #e88080;

            &:hover {
                background: rgba(232, 128, 128, 0.1);
                border-color: rgba(232, 128, 128, 0.3);
            }
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
                    color: #667eea;
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

/* ===== 地图图片上传 ===== */
.map-upload-trigger {
    width: 100%;
    height: 140px;
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    border: 1px dashed rgba(102, 126, 234, 0.4);
    background: rgba(102, 126, 234, 0.04);
    transition: border-color 0.2s ease, background 0.2s ease;

    &:hover {
        border-color: rgba(102, 126, 234, 0.7);
        background: rgba(102, 126, 234, 0.08);
    }

    .map-upload-preview {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .map-upload-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 150px;
        height: 100%;
        font-size: 12px;
        color: rgba(var(--app-rgb), 0.55);

        .placeholder-icon {
            font-size: 28px;
        }
    }
}
</style>
