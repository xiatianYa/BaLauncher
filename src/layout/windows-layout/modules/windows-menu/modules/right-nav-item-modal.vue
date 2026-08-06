<script setup lang="ts">
import { NGridItem } from 'naive-ui';
import { computed, reactive } from 'vue';
import { useRouteStore } from '@/store/modules/route';
import { useAuthStore } from '@/store/modules/auth';
import { localStg } from '@/utils/storage';
import iconRole from '@/assets/imgs/menu/menu-role.png';
import iconUser from '@/assets/imgs/menu/menu-user.png';
import iconDict from '@/assets/imgs/menu/menu-dict.png';
import iconTools from '@/assets/imgs/menu/menu-tools.png';
import iconSetting from '@/assets/imgs/menu/menu-setting.png';
import iconUpdateLog from '@/assets/imgs/menu/menu-update-log.png';
import iconCommunity from '@/assets/imgs/menu/menu-community.png';



const visible = defineModel<boolean>('visible', {
    default: false
});

const useRoute = useRouteStore();
const authStore = useAuthStore();

// 与路由 store 保持一致的权限规则：超管专属 / 管理员专属菜单
const SUPER_ADMIN_ONLY_MENU_KEYS = ['roleManage', 'dictManage'];
const ADMIN_ONLY_MENU_KEYS = ['userManage'];

const isSuperAdmin = computed(() => authStore.userInfo.roles.includes('R_SUPER'));
const isAdmin = computed(() =>
    authStore.userInfo.roles.some(role => ['R_SUPER', 'R_ADMIN'].includes(role))
);

const SideNavRoutes: Api.Route.SideNavItem[] = reactive([
    {
        name: "routes.community",
        key: "community",
        icon: "mdi:account-group",
        img: iconCommunity,
        isPersistent: true
    },
    {
        name: "routes.tools",
        key: "tools",
        icon: "gg:toolbox",
        img: iconTools,
        isPersistent: true
    },
    {
        name: "routes.updateLog",
        key: "updateLog",
        icon: "tabler:history",
        img: iconUpdateLog,
        isPersistent: true
    },
    {
        name: "routes.roleManage",
        key: "roleManage",
        icon: "hugeicons:authorized",
        img: iconRole,
        isPersistent: true
    },
    {
        name: "routes.userManage",
        key: "userManage",
        icon: "tabler:users",
        img: iconUser,
        isPersistent: true
    },
    {
        name: "routes.dictManage",
        key: "dictManage",
        icon: "mdi:book-open-outline",
        img: iconDict,
        isPersistent: true
    },
    {
        name: "routes.setting",
        key: "setting",
        icon: "tabler:settings",
        img: iconSetting,
        isPersistent: true
    },
])

// 按权限过滤可配置菜单：普通用户看不到管理员专属菜单
const filteredNavItems = computed(() =>
    SideNavRoutes.filter(item => {
        if (SUPER_ADMIN_ONLY_MENU_KEYS.includes(item.key)) {
            return isSuperAdmin.value;
        }
        if (ADMIN_ONLY_MENU_KEYS.includes(item.key)) {
            return isAdmin.value;
        }
        return true;
    })
);

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
    <NModal v-model:show="visible" preset="card" :title="$t('layout.menuConfig')" class="w-520px" :closable="true">
        <NGrid x-gap="20" y-gap="20" :cols="3">
            <NGridItem v-for="navItem in filteredNavItems" @click="AddOrRemoveSideNav(navItem)">
                <NButton class="nav-item-button" secondary>
                    <div class="w-full h-full flex items-center cursor-pointer">
                        <SvgIcon :icon="navItem.icon" class="h-full flex items-center font-size-32px mr-5px" />
                        <span class="w-full h-full flex items-center font-size-14px min-w-0 truncate">{{
                            $t(navItem.name) }}</span>
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
