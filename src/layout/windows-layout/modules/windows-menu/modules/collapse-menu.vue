<script setup lang="ts">
import { NPopover } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import { RouteRecordNameGeneric } from 'vue-router';
import { useRouterPush } from '@/hooks/common/router';
import { useRouteStore } from '@/store/modules/route';

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
        <NGrid x-gap="12" :cols="1" :y-gap="8">
            <NGridItem v-for="navItem in useRoute.SideNavRoutes" :key="navItem.key">
                <NPopover trigger="hover" placement="right">
                    <template #trigger>
                        <div class="menu-item" @click="goToRouterPath(navItem.key)">
                            <div class="menu-icon">
                                <img :src="navItem.img" class="menu-icon-img">
                            </div>
                        </div>
                    </template>
                    <span class="font-bold font-size-12px">{{ $t(navItem.name) }}</span>
                </NPopover>
            </NGridItem>
            <NGridItem>
                <button class="menu-item add-nav-btn" @click="navItemVisible = true">
                    <SvgIcon :icon="allAdded ? 'ic:round-remove' : 'ic:round-plus'" class="add-nav-icon" />
                </button>
            </NGridItem>
        </NGrid>
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

.menu-item {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(var(--app-rgb), 0.04);
    padding: 10px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid rgba(var(--app-rgb), 0.07);

    &:hover {
        background-color: rgba(var(--app-rgb), 0.07);
        border-color: rgba(102, 126, 234, 0.35);
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.18);
    }

    .menu-icon {
        width: 50px;
        height: 50px;
        background-color: rgba(102, 126, 234, 0.1);
        padding: 6px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;

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
}

/* 添加/移除导航按钮：复用 menu-item 卡片布局，撑满网格格子；虚线边框更明显，无内层背景框 */
.add-nav-btn {
    width: 100%;
    height: 100%;
    min-height: 72px; /* 与菜单项高度一致（50px 图标 + 20px 内边距 + 2px 边框），独立成行时不会塌陷变矮 */
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
