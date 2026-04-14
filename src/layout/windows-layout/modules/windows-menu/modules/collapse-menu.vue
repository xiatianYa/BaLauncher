<script setup lang="ts">
import { NPopover } from 'naive-ui';
import { ref, watch } from 'vue';
import { RouteRecordNameGeneric } from 'vue-router';
import { useRouterPush } from '@/hooks/common/router';
import { useRouteStore } from '@/store/modules/route';
import { useThemeStore } from '@/store/modules/theme';

const { routerPushByKey } = useRouterPush();

const useRoute = useRouteStore();
const themeStore = useThemeStore();

const navItemVisible = ref<boolean>(false);

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
    <div class="flex-grow p-10px">
        <NGrid x-gap="12" :cols="1" :y-gap="8">
            <NGridItem v-for="navItem in useRoute.SideNavRoutes" :key="navItem.key">
                <NPopover trigger="hover" placement="right">
                    <template #trigger>
                        <div class="menu-item" :class="{ 'is-light': !themeStore.darkMode }" @click="goToRouterPath(navItem.key)">
                            <div class="menu-icon">
                                <img :src="navItem.img" class="menu-icon-img">
                            </div>
                        </div>
                    </template>
                    <span class="font-bold font-size-12px">{{ $t(navItem.name) }}</span>
                </NPopover>
            </NGridItem>
        </NGrid>
        <NButton size="medium" class="w-full mt-10px mb-20px" dashed @click="navItemVisible = true">
            <template #icon>
                <SvgIcon icon="ic:round-plus"></SvgIcon>
            </template>
        </NButton>
        <RightNavItemModal v-model:visible="navItemVisible" />
    </div>
</template>

<style scoped lang="scss">
.menu-item {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(45, 45, 50, 0.85);
    padding: 10px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

    &:hover {
        background-color: rgba(60, 60, 65, 0.9);
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }

    .menu-icon {
        width: 50px;
        height: 50px;
        background-color: rgba(255, 255, 255, 0.08);
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
        background-color: rgba(255, 255, 255, 0.15);
        transform: scale(1.05);
    }

    /* Light Mode Styles */
    &.is-light {
        background-color: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

        &:hover {
            background-color: rgba(255, 255, 255, 0.95);
            border-color: rgba(0, 0, 0, 0.15);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .menu-icon {
            background-color: rgba(0, 0, 0, 0.04);
        }

        &:hover .menu-icon {
            background-color: rgba(0, 0, 0, 0.08);
        }
    }
}
</style>
