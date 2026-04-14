import type { App } from 'vue';
import {
    createRouter,
    createWebHashHistory,
    RouteRecordRaw
} from 'vue-router';
import { createRouterGuard } from './guard';


// 使用Vue Router提供的RouteRecordRaw类型
function createVueRoutes(): RouteRecordRaw[] {
    return [
        {
            path: '/',
            name: 'root',
            // 使用BaseLayout作为父组件
            component: () => import('@/layout/windows-layout/index.vue'),
            children: [
                {
                    path: '',
                    name: 'home',
                    component: () => import('@/views/home/index.vue'),
                    meta: {
                        title: '首页',
                        requiresAuth: false
                    }
                },
                {
                    path: 'hall',
                    name: 'hall',
                    component: () => import('@/views/hall/index.vue'),
                    meta: {
                        title: '大厅',
                        requiresAuth: false
                    }
                },
                {
                    path: 'server',
                    name: 'server',
                    component: () => import('@/views/server/index.vue'),
                    meta: {
                        title: '服务器列表',
                        requiresAuth: false
                    }
                },
                {
                    path: 'tools',
                    name: 'tools',
                    component: () => import('@/views/tools/index.vue'),
                    meta: {
                        title: '工具箱',
                        requiresAuth: false
                    }
                },
                {
                    path: 'setting',
                    name: 'setting',
                    component: () => import('@/views/setting/index.vue'),
                    meta: {
                        title: '设置',
                        requiresAuth: false
                    }
                },
                {
                    path: 'updateLog',
                    name: 'updateLog',
                    component: () => import('@/views/updateLog/index.vue'),
                    meta: {
                        title: '更新日志',
                        requiresAuth: false
                    }
                },
            ]
        }
    ];
}

export const router = createRouter({
    history: createWebHashHistory(),
    routes: createVueRoutes()
});

/** Setup Vue Router */
export async function setupRouter(app: App) {
    app.use(router);
    createRouterGuard(router);
    await router.isReady();
}
