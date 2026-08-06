<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouteRecordNameGeneric } from 'vue-router';
import { VueDraggable } from 'vue-draggable-plus';
import { useRouterPush } from '@/hooks/common/router';
import { useRouteStore } from '@/store/modules/route';
import { localStg } from '@/utils/storage';
import { ROUTE_STORAGE_KEYS } from '@/constants/cache';

const { routerPushByKey } = useRouterPush();

const useRoute = useRouteStore();

const navItemVisible = ref<boolean>(false);

// 可选导航全集（与添加导航弹窗中的选项一致）
const ALL_NAV_KEYS = ['tools', 'updateLog', 'roleManage', 'userManage', 'dictManage', 'setting'];

// 是否所有可选导航均已添加：全部添加后按钮显示为"移除"
const allAdded = computed(() =>
    ALL_NAV_KEYS.every(key => useRoute.SideNavRoutes.some(item => item.key === key))
);

const selectedKey = ref<RouteRecordNameGeneric>("")

//切换路由
const goToRouterPath = (path: string) => {
    routerPushByKey(path)
}

// 保存导航排序（与添加/移除导航的持久化方式一致）
const saveNavOrder = () => {
    localStg.set(ROUTE_STORAGE_KEYS.SIDE_NAV_ROUTES, useRoute.SideNavRoutes);
}

// 监听路由变化，同步更新 selectedKey
watch(
    () => useRoute.route.name,
    (newName: RouteRecordNameGeneric) => {
        if (newName) {
            selectedKey.value = newName;
        }
    },
    { immediate: true }
);
</script>

<template>
    <div class="menu-scroll p-10px">
        <div class="menu-grid">
            <VueDraggable v-model="useRoute.SideNavRoutes" class="menu-grid-body"
                v-on:update="saveNavOrder">
                <div v-for="navItem in useRoute.SideNavRoutes" :key="navItem.key" class="menu-grid-item">
                    <div class="menu-item" :class="{ 'is-active': selectedKey === navItem.key }"
                        @click="goToRouterPath(navItem.key)">
                        <div class="menu-icon">
                            <img :src="navItem.img" class="menu-icon-img">
                        </div>
                        <span class="menu-name">{{ $t(navItem.name) }}</span>
                    </div>
                </div>
            </VueDraggable>
            <div class="menu-grid-item">
                <button class="menu-item add-nav-btn" @click="navItemVisible = true">
                    <SvgIcon :icon="allAdded ? 'ic:round-remove' : 'ic:round-plus'" class="add-nav-icon" />
                </button>
            </div>
        </div>
        <RightNavItemModal v-model:visible="navItemVisible" />
    </div>
</template>

<style scoped lang="scss">
/* 菜单区域：占满剩余高度，超高时内部滚动，避免挤压头部/底部模块 */
.menu-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        border-radius: 4px;
        background: rgba(var(--app-rgb), 0.12);
    }
}

/* 拖拽排序网格：菜单项两列排布，与原有 NGrid 一致 */
.menu-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 8px;
}

/* 拖拽容器融入外层网格（display: contents），
   使菜单项与添加按钮按同一网格排布，按钮占一格且不参与拖拽 */
.menu-grid-body {
    display: contents;
}

.menu-grid-item {
    min-width: 0;
}

.menu-item {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: rgba(var(--app-rgb), 0.04);
    padding: 12px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid rgba(var(--app-rgb), 0.07);
    min-height: 108px; /* 固定最小高度，与 add-nav-btn 一致，避免长菜单名换行导致卡片高度不齐 */
    box-sizing: border-box;

    &:hover {
        background-color: rgba(var(--app-rgb), 0.07);
        border-color: rgba(102, 126, 234, 0.35);
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.18);
    }

    /* 当前激活菜单高亮：紫色边框 + 紫色背景，图标保持原色 */
    &.is-active {
        background-color: rgba(102, 126, 234, 0.12);
        border-color: #667eea;
        box-shadow: 0 8px 16px rgba(102, 126, 234, 0.25);

        .menu-icon {
            background-color: rgba(102, 126, 234, 0.18);
        }

        .menu-name {
            color: #667eea;
        }
    }

    .menu-icon {
        width: 56px;
        height: 56px;
        background-color: rgba(102, 126, 234, 0.1);
        padding: 8px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
        transition: all 0.3s ease;
        flex-shrink: 0;

        .menu-icon-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    }

    &:hover .menu-icon {
        background-color: rgba(102, 126, 234, 0.18);
        transform: scale(1.05);
    }

    .menu-name {
        font-size: 12px;
        font-weight: 600;
        color: rgba(var(--app-rgb), 0.88);
        letter-spacing: 0.5px;
        line-height: 18px;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}

/* 添加/移除导航按钮：复用 menu-item 卡片布局，撑满所在网格格子；虚线边框更明显，无内层背景框 */
.add-nav-btn {
    width: 100%;
    height: 100%;
    min-height: 108px; /* 与菜单项高度一致（56px 图标 + 8px 间距 + 名称行 + 24px 内边距 + 2px 边框），独立成行时不会塌陷变矮 */
    font-family: inherit;
    background-color: rgba(var(--app-rgb), 0.03);
    border: 1.5px dashed rgba(102, 126, 234, 0.5);

    &:hover {
        background-color: rgba(102, 126, 234, 0.08);
        border-color: #667eea;
    }

    .add-nav-icon {
        font-size: 28px;
        color: #667eea;
    }
}
</style>
