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
                <NPopover trigger="hover" placement="right">
                    <template #trigger>
                        <NButton strong secondary :type="selectedKey === navItem.key ? 'success' : 'default'"
                            size="large" class="w-full" @click="goToRouterPath(navItem.key)">
                            <template #icon>
                                <SvgIcon :icon="navItem.icon"></SvgIcon>
                            </template>
                        </NButton>
                    </template>
                    <span>{{ navItem.name }}</span>
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

<style scoped lang="scss"></style>