<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Component } from 'vue';
import { NCard } from 'naive-ui';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { useAuth } from '@/hooks/business/auth';
import OperationLog from './modules/operationLog.vue';
import LoginLog from './modules/loginLog.vue';
import ErrorLog from './modules/errorLog.vue';
import FileLog from './modules/fileLog.vue';
import SchedulerManage from './modules/schedulerManage.vue';

defineOptions({ name: 'LogManagePage' });

const { isAdmin } = useAuth(); // 日志管理仅管理员可见

type LogModuleKey = 'operation' | 'login' | 'error' | 'file' | 'scheduler';

interface LogModule {
  label: string;
  icon: string;
  component: Component;
}

/** 模块映射：各日志/调度任务抽离为独立组件，按 key 动态渲染 */
const moduleMap: Record<LogModuleKey, LogModule> = {
  operation: { label: 'logManage.tabs.operation', icon: 'mdi:history', component: OperationLog },
  login: { label: 'logManage.tabs.login', icon: 'mdi:login', component: LoginLog },
  error: { label: 'logManage.tabs.error', icon: 'mdi:alert-decagram', component: ErrorLog },
  file: { label: 'logManage.tabs.file', icon: 'mdi:file-upload-outline', component: FileLog },
  scheduler: { label: 'logManage.schedulerTab', icon: 'mdi:timeline-clock', component: SchedulerManage }
};

/** 标签页配置（顺序即展示顺序） */
const tabOptions: { key: LogModuleKey; label: string; icon: string }[] = [
  { key: 'operation', label: 'logManage.tabs.operation', icon: 'mdi:history' },
  { key: 'login', label: 'logManage.tabs.login', icon: 'mdi:login' },
  { key: 'error', label: 'logManage.tabs.error', icon: 'mdi:alert-decagram' },
  { key: 'file', label: 'logManage.tabs.file', icon: 'mdi:file-upload-outline' },
  { key: 'scheduler', label: 'logManage.schedulerTab', icon: 'mdi:timeline-clock' }
];

const activeModuleKey = ref<LogModuleKey>('operation');
const activeModule = computed(() => moduleMap[activeModuleKey.value]);

const handleTabChange = (key: LogModuleKey) => {
  if (activeModuleKey.value === key) return;
  activeModuleKey.value = key;
};
</script>

<template>
  <NCard class="w-full h-full" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
    <NCard class="m-10px rounded-10px" content-style="padding:25px 0px 25px 0px;" :bordered="true"
      content-class="h-full flex flex-col flex-1 overflow-hidden" header-style="padding:10px 20px 10px 20px"
      :segmented="{ content: true, footer: 'soft' }">
      <!-- 头部：标题 + 副标题 -->
      <template #header>
        <div class="header-section">
          <div class="title-section">
            <SvgIcon icon="mdi:file-document-outline" class="title-icon" />
            <div class="title-group">
              <h1 class="page-title">{{ $t('routes.logManage') }}</h1>
              <span class="page-subtitle">{{ $t('logManage.subtitle') }}</span>
            </div>
          </div>
        </div>
      </template>

      <div class="log-manage-container">
        <!-- 无权限提示 -->
        <div v-if="!isAdmin" class="no-permission">
          <SvgIcon icon="mdi:shield-lock" class="no-permission-icon" />
          <p>{{ $t('logManage.noPermission') }}</p>
        </div>

        <template v-else>
          <!-- 标签页切换 -->
          <div class="tab-bar">
            <button v-for="tab in tabOptions" :key="tab.key" class="tab-btn"
              :class="{ active: activeModuleKey === tab.key }" @click="handleTabChange(tab.key)">
              <SvgIcon :icon="tab.icon" class="tab-icon" />
              <span>{{ $t(tab.label) }}</span>
            </button>
          </div>

          <!-- 动态渲染当前模块（各日志/调度任务独立组件，状态与操作互不干扰） -->
          <component :is="activeModule.component" />
        </template>
      </div>
    </NCard>
  </NCard>
</template>

<style scoped lang="scss">
/* 头部（参考 tools/index.vue） */
.header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;

  .title-section {
    display: flex;
    align-items: center;
    gap: 12px;

    .title-icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: rgba(102, 126, 234, 0.12);
      color: #667eea;
      font-size: 20px;
    }

    .title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .page-title {
        font-size: 18px;
        font-weight: 600;
        line-height: 1.3;
        color: rgba(var(--app-rgb), 0.92);
      }

      .page-subtitle {
        font-size: 12px;
        color: rgba(var(--app-rgb), 0.45);
      }
    }
  }
}

.log-manage-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 12px;
  padding: 0 25px;
  box-sizing: border-box;

  .no-permission {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: rgba(var(--app-rgb), 0.5);

    .no-permission-icon {
      font-size: 56px;
      opacity: 0.4;
    }

    p {
      margin: 0;
      font-size: 14px;
    }
  }

  /* ===== 标签页 ===== */
  .tab-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid rgba(var(--app-rgb), 0.08);
      background: rgba(var(--app-rgb), 0.04);
      color: rgba(var(--app-rgb), 0.6);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;

      .tab-icon {
        font-size: 16px;
      }

      &:hover {
        background: rgba(var(--app-rgb), 0.08);
        color: rgba(var(--app-rgb), 0.85);
      }

      &.active {
        color: #667eea;
        background: rgba(102, 126, 234, 0.12);
        border-color: rgba(102, 126, 234, 0.3);
      }
    }
  }
}
</style>

<style lang="scss">
/* ===== 调度任务弹窗滚动 =====
   NModal 默认 teleport 到 body，scoped 样式无法作用于 naive-ui 内部的 .n-card 结构，
   故在全局样式中处理卡片布局与滚动。 */
.scheduler-modal {
  display: flex;
  flex-direction: column;
  max-height: 80vh;

  .n-card-header {
    flex-shrink: 0;
  }

  .n-card-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-gutter: stable;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 3px;
      background: color-mix(in srgb, var(--n-text-color) 18%, transparent);
    }

    &::-webkit-scrollbar-thumb:hover {
      background: color-mix(in srgb, var(--n-text-color) 30%, transparent);
    }
  }
}
</style>
