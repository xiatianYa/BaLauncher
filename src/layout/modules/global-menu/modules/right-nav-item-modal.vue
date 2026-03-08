<script setup lang="ts">
import { NGridItem } from 'naive-ui';
import { reactive } from 'vue';
import { useRouteStore } from '@/store/modules/route';
import { localStg } from '@/utils/storage';

const visible = defineModel<boolean>('visible', {
    default: false
});

const useRoute = useRouteStore();

const SideNavRoutes: Api.Route.SideNavItem[] = reactive([
    {
        name: "工具箱",
        key: "tools",
        icon: "gg:toolbox",
        isPersistent: true
    },
    {
        name: "设置",
        key: "setting",
        icon: "material-symbols:settings-outline",
        isPersistent: true
    }
])

//菜单是否已添加
const existsInRoutes = (navItem: Api.Route.SideNavItem) => {
    // 通过唯一字段判断元素是否存在（key是唯一标识）
    return useRoute.SideNavRoutes.some(item => item.key === navItem.key);
};

//添加 | 删除 菜单
const AddOrRemoveSideNav = (navItem: Api.Route.SideNavItem) => {
    if (existsInRoutes(navItem)) {
        const index = useRoute.SideNavRoutes.findIndex(item => item.key === navItem.key);
        // 使用splice删除，会触发响应式更新
        useRoute.SideNavRoutes.splice(index, 1);
    } else {
        useRoute.SideNavRoutes.push(navItem);
    }
    localStg.set('sideNavRoutes', useRoute.SideNavRoutes);
}
</script>

<template>
    <NModal v-model:show="visible" preset="card" title="菜单配置" class="w-520px" :closable="true">
        <NGrid x-gap="20" y-gap="20" :cols="3">
            <NGridItem v-for="navItem in SideNavRoutes" @click="AddOrRemoveSideNav(navItem)">
                <NButton class="nav-item-button">
                    <div class="w-full h-full flex items-center cursor-pointer">
                        <SvgIcon :icon="navItem.icon" class="h-full flex items-center font-size-32px mr-5px" />
                        <span class="w-full h-full flex items-center font-size-14px">{{ navItem.name }}</span>
                        <SvgIcon :icon="existsInRoutes(navItem) ? 'ic:round-remove' : 'ic:round-plus'"
                            class="h-full flex items-center font-size-32px mr-5px" />
                    </div>
                </NButton>
            </NGridItem>
        </NGrid>
    </NModal>
</template>

<style scoped lang="scss">
.nav-item-button {
    width: 150px;
    height: 60px;
    border-radius: 10px;
    padding: 10px;
}
</style>