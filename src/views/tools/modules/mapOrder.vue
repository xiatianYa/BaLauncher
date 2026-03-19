<script setup lang="ts">
import { useThemeStore } from '@/store/modules/theme';
import { computed, reactive, ref, watch } from 'vue';
import { NInput } from 'naive-ui';
import { fetchGetMapPage } from '@/service/api/game/map';
import { useDebounceFn } from '@vueuse/core';
import { useDict } from '@/hooks/business/dict';
import { useGameStore } from '@/store/modules/game';

/** 主题相关 */
const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);

const { dictOptions } = useDict();
const gameStore = useGameStore();

/**
 * 事件定义
 */
const emit = defineEmits<{ back: []; }>();

/**
 * 返回工具箱
 */
const handleBackFn = () => emit('back');

// 搜索关键词
const searchKeyword = ref('');

// 地图分页列表
const mapList = ref<Api.Game.MapVo[]>([]);

// 地图加载状态
const mapLoading = ref(false);

// 分页对象
const pagination = reactive<Api.Common.PaginatingCommonParams>({
    /** current page number */
    current: 1,
    /** page size */
    size: 12,
    /** total count */
    total: 0
});

// 搜索地图
const searchMaps = async (keyword: string) => {
    if (!keyword.trim()) return;
    mapLoading.value = true;
    try {
        const { data } = await fetchGetMapPage(pagination, keyword.trim());
        mapList.value = data?.records || [];
        pagination.total = data?.total || 0;
    } catch (error) {
        window?.$message?.error("搜索地图失败");
    } finally {
        setTimeout(() => {
            mapLoading.value = false;
        }, 500);
    }
};

// 查询服务器地图类型
const queryServerMapType = (mapName: string) => {
    return gameStore.mapList.find(map => map.mapName === mapName)?.type;
}

// 查询服务器地图标签
const queryServerMapTag = (mapName: string) => {
    return gameStore.mapList.find(map => map.mapName === mapName)?.tag;
}

// 使用防抖处理输入变化
const debouncedSearch = useDebounceFn((value: string) => {
    searchMaps(value);
}, 100);

// 分页更新
const handleUpdatePage = (page: number) => {
    pagination.current = page;
    searchMaps(searchKeyword.value);
};

// 监听输入变化
watch(searchKeyword, (newValue) => {
    pagination.current = 1;
    debouncedSearch(newValue);
});
</script>

<template>
    <div class="map-order-container" :class="{ 'light-mode': !isDarkMode }">
        <div class="header-section">
            <div class="title-section">
                <SvgIcon icon="material-symbols:map-outline" />
                <h1 class="page-title">地图订阅</h1>
            </div>
            <div class="back-btn" @click="handleBackFn">
                <SvgIcon icon="material-symbols:arrow-back" class="back-icon" />
                <span>{{ $t('keyBind.back') }}</span>
            </div>
        </div>
        <div class="main-content">
            <NCard class="left-panel" content-class="h-full overflow-auto" content-style="padding:5px;"
                footer-style="padding:10px">
                <template #header>
                    <div class="search-container">
                        <NInput v-model:value="searchKeyword" type="text" placeholder="搜索地图名称，译名，或标签" clearable
                            class="search-input">
                            <template #prefix>
                                <SvgIcon icon="material-symbols:search" class="search-icon" />
                            </template>
                        </NInput>
                    </div>
                </template>
                <NGrid :cols="2" x-gap="10px" y-gap="10px" v-if="!mapLoading">
                    <NGridItem v-for="map in mapList" :key="map.id">
                        <NCard class="map-card" content-style="padding:10px" footer-style="padding:10px">
                            <div class="map-card-img">
                                <img class="w-full h-full" :src="map.mapUrl" alt="地图图片" />
                            </div>
                            <div class="map-card-info">
                                <div class="map-card-name">{{ map.mapName }}</div>
                                <div class="map-card-label">{{ map.mapLabel }}</div>
                            </div>
                            <div class="flex-y-center mt-5px position-relative font-bold flex-1">
                                <NTag size="small" class="mr-3px rounded-5px" ghost
                                    :type="dictOptions('game_type').find((item: any) => item.value === queryServerMapType(map.mapName))?.type"
                                    v-show="queryServerMapType(map.mapName)">
                                    {{dictOptions('game_type').find((item: any) => item.value ===
                                        queryServerMapType(map.mapName))?.label}}
                                </NTag>
                                <NTag v-for="(tag, index) in queryServerMapTag(map.mapName)" :key="index" size="small"
                                    class="mr-3px rounded-5px" type="success" v-show="queryServerMapType(map.mapName)">
                                    {{dictOptions('game_tag').find((item: any) => item.value === tag)?.label}}
                                </NTag>
                            </div>
                            <template #footer>
                                <div class="flex mt-5px">
                                    <NButton type="info" ghost size="small" class="w-full rounded-5px">
                                        <SvgIcon icon="material-symbols:add-2" class="mr-3px" />
                                        订阅
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
                            @update-page="handleUpdatePage" />
                    </div>
                </template>
            </NCard>
            <NCard class="right-panel" content-class="h-full overflow-auto" content-style="padding:10px;">
                123123
            </NCard>
        </div>
    </div>
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
                height: 280px;
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
                padding: 0 0 16px 0;
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
        }
    }
}

// 搜索容器样式
.search-container {
    width: 100%;

    .search-input {
        width: 100%;

        ::v-deep(.n-input__input-el) {
            font-size: 14px;
        }

        ::v-deep(.n-input__placeholder) {
            font-size: 14px;
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
</style>
