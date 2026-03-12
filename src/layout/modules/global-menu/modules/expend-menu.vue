<script setup lang="ts">
import { NGridItem } from 'naive-ui';
import { ref, watch } from 'vue';
import { RouteRecordNameGeneric } from 'vue-router';
import { useRouterPush } from '@/hooks/common/router';
import { useRouteStore } from '@/store/modules/route';

const { routerPushByKey } = useRouterPush();

const useRoute = useRouteStore();

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
        <NGrid x-gap="12" :cols="2" :y-gap="8">
            <NGridItem v-for="navItem in useRoute.SideNavRoutes" :key="navItem.key">
                <div class="menu-item" @click="goToRouterPath(navItem.key)">
                    <div class="menu-icon">
                        <img :src="navItem.img" class="menu-icon-img">
                    </div>
                    <span class="menu-name">{{ navItem.name }}</span>
                </div>
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
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: rgba($color: #f1f1f1, $alpha: 0.7);
    padding: 5px;
    border-radius: 5px;
    cursor: pointer;

    .menu-icon {
        height: 60px;
        background-color: rgba($color: #c9c9ca, $alpha: 0.5);
        padding: 5px;
        border-radius: 5px;

        .menu-icon-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            background-size: 100% 100%;
        }
    }

    .menu-name {
        font-size: 12px;
        font-weight: 600;
        color: black;
    }
}
</style>