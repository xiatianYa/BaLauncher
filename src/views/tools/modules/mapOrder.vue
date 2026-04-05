<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue';
import { NInput, NModal, NButton, NSelect } from 'naive-ui';
import { useDebounceFn } from '@vueuse/core';
import { useThemeStore } from '@/store/modules/theme';
import { useGameStore } from '@/store/modules/game';
import { useAuthStore } from '@/store/modules/auth';
import { useDict } from '@/hooks/business/dict';
import { fetchAddMapSubscribe, fetchDeleteMapSubscribe, fetchGetMapPage, fetchGetUserSubscribeList, fetchUpdateMapSubscribe } from '@/service/api/game/map';
import { $t } from '@/locales';
import dayjs from 'dayjs';
import { fetchGetGroupList } from '@/service/api/game/group';
import { fetchBindQQ, fetchBindQQGroup } from '@/service/api/system/user';

defineOptions({
    name: 'MapOrder'
});

/* ================================ Constants ================================ */

const DEBOUNCE_DELAY = 300; // 防抖延迟时间（毫秒）
const LOADING_DELAY = 500; // 加载延迟时间（毫秒）
const DEFAULT_PAGE_SIZE = 12; // 默认每页显示数量

/* ================================ Composables ================================ */

const themeStore = useThemeStore(); // 主题Store
const gameStore = useGameStore(); // 游戏Store
const authStore = useAuthStore(); // 认证Store
const { dictOptions } = useDict(); // 字典选项

/* ================================ Emits ================================ */

const emit = defineEmits<{ back: [] }>(); // 定义事件

/* ================================ Reactive State ================================ */

const isDarkMode = computed(() => themeStore.darkMode); // 是否为深色模式

const searchKeyword = ref<string>(''); // 搜索关键词
const mapList = ref<Api.Game.MapVo[]>([]); // 地图列表
const subscribeList = ref<Api.Game.MapVo[]>([]); // 订阅列表
const mapLoading = ref<boolean>(false); // 地图加载状态
const subscribeLoading = ref<boolean>(false); // 订阅加载状态
const qqGroupOptions = ref<CommonType.Option<string>[]>([]); // QQ群配置项

const pagination = reactive<Api.Common.PaginatingCommonParams>({
    current: 1, // 当前页码
    size: DEFAULT_PAGE_SIZE, // 每页数量
    total: 0 // 总数
});

const getSubscribedMap = (mapId: number) =>
    subscribeList.value.find(map => map.id === mapId); // 获取已订阅地图

const isSystemSubscribed = (mapId: number) => {
    const subscribedMap = getSubscribedMap(mapId);
    return subscribedMap?.systemOrder === '1'; // 检查是否已系统订阅
};

const isQQSubscribed = (mapId: number) => {
    const subscribedMap = getSubscribedMap(mapId);
    return subscribedMap?.qqOrder === '1'; // 检查是否已QQ订阅
};

const isCurrentSystemSubscribed = computed(() =>
    currentSubscribeMap.value ? isSystemSubscribed(currentSubscribeMap.value.id) : false // 当前地图是否已系统订阅
);

const isCurrentQQSubscribed = computed(() =>
    currentSubscribeMap.value ? isQQSubscribed(currentSubscribeMap.value.id) : false // 当前地图是否已QQ订阅
);

const showSubscribeModal = ref<boolean>(false); // 订阅弹框显示状态
const currentSubscribeMap = ref<Api.Game.MapVo | null>(null); // 当前订阅的地图

const showBindQQModal = ref<boolean>(false); // 绑定QQ弹框显示状态
const bindQQId = ref<string | null>(null); // 绑定的QQ号
const bindQQGroup = ref<string | null>(null); // 绑定的QQ群

const showEditModal = ref<boolean>(false); // 编辑弹框显示状态
const currentEditMap = ref<Api.Game.MapVo | null>(null); // 当前编辑的地图

const isCurrentEditSystemSubscribed = computed(() =>
    currentEditMap.value ? isSystemSubscribed(currentEditMap.value.id) : false // 编辑地图是否已系统订阅
);

const isCurrentEditQQSubscribed = computed(() =>
    currentEditMap.value ? isQQSubscribed(currentEditMap.value.id) : false // 编辑地图是否已QQ订阅
);

/* ================================ 编辑相关函数 ================================ */

const handleEditSubscribe = (map: Api.Game.MapVo): void => {
    currentEditMap.value = map; // 设置当前编辑的地图
    showEditModal.value = true; // 显示编辑弹框
};

const handleEditSystemSubscribe = async (): Promise<void> => {
    if (!currentEditMap.value) return;
    await handleSystemSubscribeDirect(currentEditMap.value); // 直接系统订阅
    showEditModal.value = false; // 关闭编辑弹框
    currentEditMap.value = null; // 重置当前编辑地图
};

const handleEditQQSubscribe = async (): Promise<void> => {
    if (!currentEditMap.value) return;
    await handleQQSubscribeDirect(currentEditMap.value); // 直接QQ订阅
    showEditModal.value = false; // 关闭编辑弹框
    currentEditMap.value = null; // 重置当前编辑地图
};

const handleEditUnsubscribeSystem = async (): Promise<void> => {
    if (!currentEditMap.value) return;
    await handleUnsubscribeSystem(currentEditMap.value); // 取消系统订阅
};

const handleEditUnsubscribeQQ = async (): Promise<void> => {
    if (!currentEditMap.value) return;
    await handleUnsubscribeQQ(currentEditMap.value); // 取消QQ订阅
};

const handleDeleteSubscribe = async (): Promise<void> => {
    if (!currentEditMap.value) return;
    const { error } = await fetchDeleteMapSubscribe(currentEditMap.value!.id); // 删除订阅
    if (!error) {
        window.$message?.success($t('mapOrder.unsubscribeSuccess')); // 提示成功
    } else {
        window.$message?.error($t('mapOrder.unsubscribeFailed')); // 提示失败
    }
    showEditModal.value = false; // 关闭编辑弹框
    currentEditMap.value = null; // 重置当前编辑地图
    await fetchSubscribeList(); // 刷新订阅列表
};

/* ================================ Event Handlers ================================ */

const handleBack = (): void => emit('back'); // 返回

const handlePageChange = (page: number): void => {
    pagination.current = page; // 更新当前页码
    fetchMapList(searchKeyword.value); // 获取地图列表
};

const handleSystemSubscribe = async (): Promise<void> => {
    if (!currentSubscribeMap.value) return;
    const { error } = await fetchAddMapSubscribe(currentSubscribeMap.value.id, "1", null); // 添加系统订阅
    if (!error) {
        window.$message?.success($t('mapOrder.subscribeSuccess')); // 提示成功
    } else {
        window.$message?.error($t('mapOrder.subscribeFailed')); // 提示失败
    }
    showSubscribeModal.value = false; // 关闭订阅弹框
    currentSubscribeMap.value = null; // 重置当前订阅地图
    await fetchSubscribeList(); // 刷新订阅列表
};

const onGetOption = async () => {
    const { data, error } = await fetchGetGroupList(); // 获取QQ群列表
    if (!error) {
        qqGroupOptions.value = data; // 设置QQ群选项
    }
};

const handleQQSubscribe = async (): Promise<void> => {
    if (!currentSubscribeMap.value) return;

    if (!authStore.userInfo.qqId || !authStore.userInfo.qqgroup) {
        showSubscribeModal.value = false; // 关闭订阅弹框
        bindQQId.value = authStore.userInfo.qqId; // 设置QQ号
        bindQQGroup.value = authStore.userInfo.qqgroup; // 设置QQ群
        showBindQQModal.value = true; // 显示绑定QQ弹框
        return;
    }
    const { error } = await fetchAddMapSubscribe(currentSubscribeMap.value.id, null, "1"); // 添加QQ订阅
    if (!error) {
        window.$message?.success($t('mapOrder.subscribeSuccess')); // 提示成功
    } else {
        window.$message?.error($t('mapOrder.subscribeFailed')); // 提示失败
    }

    showSubscribeModal.value = false; // 关闭订阅弹框
    currentSubscribeMap.value = null; // 重置当前订阅地图
    await fetchSubscribeList(); // 刷新订阅列表
};

const handleBindQQ = async (): Promise<void> => {
    if (!bindQQId.value || !bindQQGroup.value) {
        window.$message?.error($t('mapOrder.qqAndGroupCannotBeEmpty')); // 提示QQ号和QQ群不能为空
        return;
    }
    const { error } = await fetchBindQQ(bindQQId.value); // 绑定QQ号
    const { error: error2 } = await fetchBindQQGroup(bindQQGroup.value); // 绑定QQ群
    if (!error && !error2) {
        window.$message?.success($t('mapOrder.bindSuccess')); // 提示绑定成功
        await authStore.getUserInfo(); // 刷新用户信息
    } else if (error) {
        window.$message?.error(error.message); // 提示绑定QQ失败
    } else if (error2) {
        window.$message?.error(error2.message); // 提示绑定QQ群失败
    }
    showBindQQModal.value = false; // 关闭绑定QQ弹框
};

const handleSystemSubscribeDirect = async (map: Api.Game.MapVo): Promise<void> => {
    const { error } = await fetchAddMapSubscribe(map.id, "1", null); // 直接添加系统订阅
    if (!error) {
        window.$message?.success($t('mapOrder.subscribeSuccess')); // 提示成功
    } else {
        window.$message?.error($t('mapOrder.subscribeFailed')); // 提示失败
    }
    await fetchSubscribeList(); // 刷新订阅列表
};

const handleQQSubscribeDirect = async (map: Api.Game.MapVo): Promise<void> => {
    if (!authStore.userInfo.qqId || !authStore.userInfo.qqgroup) {
        currentSubscribeMap.value = map; // 设置当前订阅地图
        bindQQId.value = authStore.userInfo.qqId; // 设置QQ号
        bindQQGroup.value = authStore.userInfo.qqgroup; // 设置QQ群
        showBindQQModal.value = true; // 显示绑定QQ弹框
        return;
    }
    const { error } = await fetchAddMapSubscribe(map.id, null, "1"); // 直接添加QQ订阅
    if (!error) {
        window.$message?.success($t('mapOrder.subscribeSuccess')); // 提示成功
    } else {
        window.$message?.error($t('mapOrder.subscribeFailed')); // 提示失败
    }
    await fetchSubscribeList(); // 刷新订阅列表
};

const handleUnsubscribeSystem = async (map: Api.Game.MapVo): Promise<void> => {
    const params: Api.Game.UpdateMapSubscribeParams = {
        mapId: map.id,
        systemOrder: "0",
        qqOrder: null,
    };
    const { error } = await fetchUpdateMapSubscribe(params); // 更新订阅（取消系统订阅）
    if (!error) {
        window.$message?.success($t('mapOrder.unsubscribeSystemSuccess')); // 提示已取消系统订阅
    } else {
        window.$message?.error($t('mapOrder.unsubscribeFailed')); // 提示失败
    }
    await fetchSubscribeList(); // 刷新订阅列表
    if (showEditModal.value && currentEditMap.value?.id === map.id) {
        showEditModal.value = false; // 关闭编辑弹框
        currentEditMap.value = null; // 重置当前编辑地图
    }
};

const handleUnsubscribeQQ = async (map: Api.Game.MapVo): Promise<void> => {
    const params: Api.Game.UpdateMapSubscribeParams = {
        mapId: map.id,
        systemOrder: null,
        qqOrder: "0",
    };
    const { error } = await fetchUpdateMapSubscribe(params); // 更新订阅（取消QQ订阅）
    if (!error) {
        window.$message?.success($t('mapOrder.unsubscribeQQSuccess')); // 提示已取消QQ订阅
    } else {
        window.$message?.error($t('mapOrder.unsubscribeFailed')); // 提示失败
    }
    await fetchSubscribeList(); // 刷新订阅列表
    if (showEditModal.value && currentEditMap.value?.id === map.id) {
        showEditModal.value = false; // 关闭编辑弹框
        currentEditMap.value = null; // 重置当前编辑地图
    }
};

/* ================================ Data Fetching ================================ */
// 获取地图列表
const fetchMapList = async (keyword: string): Promise<void> => {
    mapLoading.value = true; // 开始加载

    try {
        const { data } = await fetchGetMapPage(pagination, keyword.trim()); // 获取地图分页数据
        mapList.value = data?.records || []; // 设置地图列表
        pagination.total = data?.total || 0; // 设置总数
    } catch (error) {
        window.$message?.error($t('mapOrder.searchFailed')); // 提示搜索失败
        console.error('[MapOrder] Failed to fetch map list:', error);
    } finally {
        setTimeout(() => {
            mapLoading.value = false; // 结束加载
        }, LOADING_DELAY);
    }
};

// 获取用户订阅列表
const fetchSubscribeList = async (): Promise<void> => {
    subscribeLoading.value = true; // 开始加载
    try {
        const { data } = await fetchGetUserSubscribeList(); // 获取用户订阅列表
        subscribeList.value = data || []; // 设置订阅列表
    } catch (error) {
        window.$message?.error($t('mapOrder.fetchSubscribeListFailed')); // 提示获取失败
        console.error('[MapOrder] Failed to fetch subscribe list:', error);
    } finally {
        subscribeLoading.value = false; // 结束加载
    }
};

/* ================================ Utility Functions ================================ */
const getMapTypeInfo = (mapName: string | undefined): Api.Game.Map | undefined => {
    if (!mapName) return undefined;
    return gameStore.mapList.find(map => map.mapName === mapName); // 获取地图类型信息
};

const getMapType = (mapName: string | undefined): string | undefined => getMapTypeInfo(mapName)?.type; // 获取地图类型

const getMapTags = (mapName: string | undefined): string[] => {
    const mapInfo = getMapTypeInfo(mapName);
    if (!mapInfo?.tag) return [];
    return Array.isArray(mapInfo.tag) ? mapInfo.tag : [mapInfo.tag]; // 获取地图标签
};

const getGameTypeOption = (type: string | undefined) =>
    type ? dictOptions('game_type').find((item: any) => item.value === type) : undefined; // 获取游戏类型选项

const getGameTagOption = (tag: string | undefined) =>
    tag ? dictOptions('game_tag').find((item: any) => item.value === tag) : undefined; // 获取游戏标签选项

/* ================================ Watchers ================================ */

const debouncedSearch = useDebounceFn(fetchMapList, DEBOUNCE_DELAY); // 防抖搜索

watch(searchKeyword, (newValue) => {
    pagination.current = 1; // 重置到第一页
    debouncedSearch(newValue); // 执行搜索
});

/* ================================ Lifecycle ================================ */

onMounted(async () => {
    fetchMapList(''); // 获取地图列表
    fetchSubscribeList(); // 获取订阅列表
    onGetOption(); // 获取QQ群选项
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
                                <img class="w-full h-full max-h-160px object-cover" v-lazy="map.mapUrl" alt="map" />
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
                            <div class="text-12px mt-5px">
                                <div class="flex justify-between">
                                    <span class="color-#999">{{ $t('mapOrder.achievement') }}:</span>
                                    <NTag size="small" class="rounded-5px" type="info">
                                        {{ map.exgMap?.achievement10 || '-' }}
                                    </NTag>
                                </div>
                                <div class="flex justify-between mt-5px">
                                    <span class="color-#999">{{ $t('mapOrder.lastRun') }}:</span>
                                    <NTag size="small" class="rounded-5px" type="info">
                                        {{ dayjs(map.exgMap?.lastRun).format('YYYY-MM-DD HH:mm:ss') || '-'
                                        }}</NTag>
                                </div>
                                <div class="flex justify-between mt-5px">
                                    <span class="color-#999">{{ $t('mapOrder.cooldown') }}:</span>
                                    <NTag size="small" class="rounded-5px" type="info">
                                        {{ map.exgMap?.cooldownMinute || '-' }} {{ $t('mapOrder.minutes') }}</NTag>
                                </div>
                                <div class="flex justify-between mt-5px">
                                    <span class="color-#999">{{ $t('mapOrder.deadline') }}:</span>
                                    <NTag size="small" class="rounded-5px" type="info">
                                        {{ dayjs(map.exgMap?.deadline).format('YYYY-MM-DD HH:mm:ss') || '-'
                                        }}</NTag>
                                </div>
                                <div class="flex justify-between mt-5px">
                                    <span class="color-#999">{{ $t('mapOrder.isOrderable') }}:</span>
                                    <NTag v-if="map.exgMap?.isOrder" type="success" size="small" class="rounded-5px">{{
                                        $t('mapOrder.yes') }}</NTag>
                                    <NTag v-else type="error" size="small" class="rounded-5px">{{ $t('mapOrder.no') }}
                                    </NTag>
                                </div>
                            </div>
                            <template #footer>
                                <div class="flex flex-wrap gap-5px mt-5px" v-if="map.isOrder === '1'">
                                    <NButton v-if="!isSystemSubscribed(map.id)" type="info" ghost size="small"
                                        class="flex-1 rounded-5px" @click="handleSystemSubscribeDirect(map)">
                                        <SvgIcon icon="tabler:device-desktop" class="mr-3px" />
                                        {{ $t('mapOrder.systemSubscribe') }}
                                    </NButton>
                                    <NButton v-else type="info" size="small" class="flex-1 rounded-5px"
                                        @click="handleUnsubscribeSystem(map)">
                                        <SvgIcon icon="tabler:device-desktop" class="mr-3px" />
                                        {{ $t('mapOrder.unsubscribeSystem') }}
                                    </NButton>
                                    <NButton v-if="!isQQSubscribed(map.id)" type="success" ghost size="small"
                                        class="flex-1 rounded-5px" @click="handleQQSubscribeDirect(map)">
                                        <SvgIcon icon="basil:qq-outline" class="mr-3px" />
                                        {{ $t('mapOrder.qqSubscribe') }}
                                    </NButton>
                                    <NButton v-else type="success" size="small" class="flex-1 rounded-5px"
                                        @click="handleUnsubscribeQQ(map)">
                                        <SvgIcon icon="basil:qq-outline" class="mr-3px" />
                                        {{ $t('mapOrder.unsubscribeQQ') }}
                                    </NButton>
                                </div>
                                <div class="flex mt-5px" v-else>
                                    <NButton type="error" ghost size="small" class="w-full rounded-5px"
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
                        <div class="subscribe-item-header">
                            <div class="subscribe-item-img">
                                <img :src="map.mapUrl" :alt="map.mapName" />
                            </div>
                            <div class="subscribe-item-info">
                                <div class="subscribe-item-name">{{ map.mapName }}</div>
                                <div class="subscribe-item-label">{{ map.mapLabel }}</div>
                            </div>
                            <NButton type="info" ghost class="subscribe-item-remove rounded-5px"
                                @click="handleEditSubscribe(map)">
                                <template #icon>
                                    <SvgIcon icon="material-symbols:left-panel-open-outline" />
                                </template>
                                {{ $t('mapOrder.edit') }}
                            </NButton>
                        </div>
                        <NCollapse class="subscribe-item-collapse">
                            <NCollapseItem :title="$t('mapOrder.mapCD')" name="mapCd">
                                <div class="text-12px mt-5px">
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
                                        <NTag v-if="map.exgMap?.isOrder" type="success" size="small"
                                            class="rounded-5px">
                                            {{
                                                $t('mapOrder.yes') }}</NTag>
                                        <NTag v-else type="error" size="small" class="rounded-5px">{{ $t('mapOrder.no')
                                        }}
                                        </NTag>
                                    </div>
                                </div>
                            </NCollapseItem>
                        </NCollapse>
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
                    <NSelect v-model:value="bindQQGroup" :options="qqGroupOptions"
                        :placeholder="$t('mapOrder.pleaseSelectQQGroup')" class="form-input" clearable />
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

    <NModal v-model:show="showEditModal" :bordered="true" preset="card"
        class="w-400px rounded-20px subscribe-modal-wrapper" :class="{ 'light-mode': !isDarkMode }" :closable="false"
        size="small">
        <template #header>
            <div class="flex items-center font-size-18px">
                <div class="font-size-16px">{{ $t('mapOrder.editSubscribe') }}</div>
            </div>
        </template>
        <div class="subscribe-modal-new">
            <div class="subscribe-header">
                <div class="character-image">
                    <img src="@/assets/imgs/tool/3594431.png" alt="character" />
                </div>
                <div class="header-glow"></div>
            </div>
            <div class="flex flex-wrap gap-10px mt-20px">
                <NButton v-if="!isCurrentEditSystemSubscribed" type="info" ghost class="flex-1 rounded-5px"
                    @click="handleEditSystemSubscribe()">
                    <template #icon>
                        <SvgIcon icon="tabler:device-desktop" />
                    </template>
                    {{ $t('mapOrder.systemSubscribe') }}
                </NButton>
                <NButton v-else type="info" class="flex-1 rounded-5px" @click="handleEditUnsubscribeSystem()">
                    <template #icon>
                        <SvgIcon icon="tabler:device-desktop" />
                    </template>
                    {{ $t('mapOrder.unsubscribeSystem') }}
                </NButton>
                <NButton v-if="!isCurrentEditQQSubscribed" type="success" ghost class="flex-1 rounded-5px"
                    @click="handleEditQQSubscribe()">
                    <template #icon>
                        <SvgIcon icon="basil:qq-outline" />
                    </template>
                    {{ $t('mapOrder.qqSubscribe') }}
                </NButton>
                <NButton v-else type="success" class="flex-1 rounded-5px" @click="handleEditUnsubscribeQQ()">
                    <template #icon>
                        <SvgIcon icon="basil:qq-outline" />
                    </template>
                    {{ $t('mapOrder.unsubscribeQQ') }}
                </NButton>
            </div>
            <div class="mt-20px">
                <NButton type="error" ghost class="w-full rounded-5px" @click="handleDeleteSubscribe">
                    <template #icon>
                        <SvgIcon icon="material-symbols:delete-outline" />
                    </template>
                    {{ $t('mapOrder.deleteSubscribe') }}
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
                height: 100%;
                border-radius: 5px;
                overflow: hidden;

                .map-card-img {
                    width: 100%;
                    object-fit: cover;
                    overflow: hidden;
                    border-radius: 10px;
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
                    flex-direction: column;
                    gap: 8px;
                    padding: 8px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.3s ease;

                    .subscribe-item-header {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        width: 100%;
                    }

                    .subscribe-item-img {
                        width: 50px;
                        height: 50px;
                        border-radius: 5px;
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

                    .subscribe-item-collapse {
                        width: 100%;
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
