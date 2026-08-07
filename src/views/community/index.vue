<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NCard, NGrid, NGridItem } from 'naive-ui';
import { fetchGetCommunityPage } from '@/service/api';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';

defineOptions({ name: 'community' });

/** 社区列表 */
const list = ref<Api.Game.Community[]>([]);
/** 加载状态 */
const loading = ref(false);
/** 当前页 */
const current = ref(1);
/** 每页条数（每行 3 个，一次加载 9 个） */
const size = 9;
/** 是否已加载全部 */
const finished = ref(false);

/** 骨架屏数量：首屏 9 个占满三行，滚动加载更多时追加 6 个 */
const skeletonCount = computed(() => (list.value.length === 0 ? 9 : 6));

/** 加载社区分页数据（追加到列表尾部） */
const loadCommunity = async () => {
  // 防重入：加载中或已加载完则忽略
  if (loading.value || finished.value) return;
  loading.value = true;
  try {
    const params: Api.Game.CommunitySearchParams = {
      current: current.value,
      size
    };
    const { data, error } = await fetchGetCommunityPage(params);
    if (!error && data) {
      const records = data.records || [];
      list.value.push(...records);
      // 本次返回不足一页 => 没有更多数据
      if (records.length < size) {
        finished.value = true;
      }
      current.value += 1;
    } else {
      finished.value = true;
    }
  } finally {
    loading.value = false;
  }
};

/** 滚动到底部继续加载（无限滚动） */
const handleScroll = (e: Event) => {
  const el = e.target as HTMLElement;
  // 距底部 60px 内触发下一页加载
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) {
    loadCommunity();
  }
};

/** logo 加载失败时回退显示默认图标 */
const onLogoError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
  img.parentElement?.classList.add('logo-error');
};

/** 打开社区网站（新开窗口） */
const openWebsite = (website?: string) => {
  if (!website) {
    window.$message?.warning($t('community.noWebsite'));
    return;
  }
  window.ipcRenderer.openExternalWindow(website);
};

onMounted(() => {
  loadCommunity();
});
</script>

<template>
  <NCard class="w-full h-full" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
    <NCard class="m-10px rounded-10px" content-style="padding:0px 25px 25px 25px;" :bordered="true"
      content-class="h-full flex flex-col flex-1 overflow-hidden" header-style="padding:10px 20px 10px 20px"
      :segmented="{ content: true }">
      <!-- 头部：标题 + 副标题 -->
      <template #header>
        <div class="header-section">
          <div class="title-section">
            <SvgIcon icon="mdi:account-group" class="title-icon" />
            <div class="title-group">
              <h1 class="page-title">{{ $t('routes.community') }}</h1>
              <span class="page-subtitle">{{ $t('community.subtitle') }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- 社区卡片列表（滚动到底部继续分页） -->
      <div class="community-list" @scroll="handleScroll">
        <NGrid :x-gap="16" :y-gap="16" :cols="2" responsive="screen" item-responsive>
          <NGridItem v-for="(item, index) in list" :key="item.id" span="3 s:2 m:1 l:1">
            <div class="community-card" :style="{ '--delay': `${index * 0.04}s` }" @click="openWebsite(item.website)">
              <div class="card-logo-wrap">
                <img v-if="item.logo" :src="item.logo" class="card-logo" alt="logo" loading="lazy" @error="onLogoError" />
              </div>
              <div class="card-body">
                <div class="card-name" :title="item.communityName">{{ item.communityName || '-' }}</div>
                <div class="card-website" :title="item.website">{{ item.website || $t('community.noWebsite') }}</div>
              </div>
              <div class="card-open">
                <SvgIcon icon="mdi:open-in-new" />
                <span>{{ $t('community.visit') }}</span>
              </div>
            </div>
          </NGridItem>

          <!-- 骨架屏（首屏 9 个 / 滚动加载更多 6 个） -->
          <NGridItem v-if="loading" v-for="i in skeletonCount" :key="`skeleton-${i}`" span="3 s:2 m:1 l:1">
            <div class="community-card skeleton">
              <div class="skeleton-logo" />
              <div class="skeleton-line" />
              <div class="skeleton-line short" />
            </div>
          </NGridItem>
        </NGrid>

        <!-- 空状态 -->
        <div v-if="!loading && list.length === 0" class="empty-state">
          <SvgIcon icon="mdi:account-group-outline" class="empty-icon" />
          <p>{{ $t('community.empty') }}</p>
        </div>

        <!-- 加载更多 / 没有更多 -->
        <div v-if="list.length > 0" class="load-status">
          <span v-if="loading">{{ $t('community.loading') }}</span>
          <span v-else-if="finished">{{ $t('community.noMore') }}</span>
        </div>
      </div>
    </NCard>
  </NCard>
</template>

<style scoped lang="scss">
/* 头部（参考 userManage / tools） */
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

.community-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* 首行卡片与顶部保持间距 */
  padding: 16px 2px 2px;

  .n-grid {
    width: 100%;
  }
}

/* 社区卡片（每行 3 个） */
.community-card {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 100%;
  padding: 16px;
  border-radius: 14px;
  background: rgba(var(--app-rgb), 0.04);
  border: 1px solid rgba(var(--app-rgb), 0.07);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  animation: cardIn 0.45s ease-out forwards;
  animation-delay: var(--delay);
  opacity: 0;
  box-sizing: border-box;

  &:hover {
    transform: translateY(-4px);
    background: rgba(var(--app-rgb), 0.07);
    border-color: rgba(102, 126, 234, 0.35);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);

    .card-open {
      color: #667eea;
      background: rgba(102, 126, 234, 0.18);
    }
  }

  .card-logo-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    /* 固定宽高 72px，logo 等比缩放完整显示在区域内，不裁切 */
    width: 72px;
    height: 72px;
    border-radius: 16px;
    background: rgba(102, 126, 234, 0.12);
    flex-shrink: 0;
    box-sizing: border-box;
    overflow: hidden;

    .card-logo {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* logo 加载失败时显示默认图标 */
    &.logo-error {
      .card-logo-fallback {
        display: block;
      }
    }
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;

    .card-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--n-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card-website {
      font-size: 12px;
      color: rgba(var(--app-rgb), 0.45);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .card-open {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 12px;
    color: rgba(var(--app-rgb), 0.55);
    background: rgba(var(--app-rgb), 0.06);
    white-space: nowrap;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
}

/* 骨架屏 */
.skeleton {
  pointer-events: none;

  .skeleton-logo,
  .skeleton-line {
    background: linear-gradient(90deg, rgba(var(--app-rgb), 0.04) 25%, rgba(var(--app-rgb), 0.09) 50%, rgba(var(--app-rgb), 0.04) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
  }

  .skeleton-logo {
    width: 72px;
    height: 72px;
    border-radius: 16px;
    flex-shrink: 0;
  }

  .skeleton-line {
    height: 14px;
    width: 60%;

    &.short {
      width: 40%;
    }
  }
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 20px;
  color: rgba(var(--app-rgb), 0.5);

  .empty-icon {
    font-size: 56px;
    opacity: 0.4;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
}

/* 加载更多 / 没有更多提示 */
.load-status {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0 4px;
  font-size: 12px;
  color: rgba(var(--app-rgb), 0.4);
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
