<script setup lang="ts">
import { NCard, NTag } from 'naive-ui';
import { computed } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { useGameStore } from '@/store/modules/game';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { $t } from '@/locales';
import { useDict } from '@/hooks/business/dict';

const { dictType } = useDict();

const props = defineProps<{
  selectedId: number | null;
}>();

const emit = defineEmits<{
  (e: 'select', id: number): void;
}>();

const gameStore = useGameStore();

const getCommunityTagType = (playerNumber: number) => {
  const level = playerNumber < 300 ? 'normal' : playerNumber < 500 ? 'warning' : 'error';
  return dictType('community_level', level);
};

/**
 * 各社区在线人数映射：从 WebSocket 全量服务器列表（currentServerWsList，覆盖所有社区）
 * 按 communityId 汇总在线玩家数，避免使用接口返回的旧 playerNumber。
 * currentServerList 只含当前选中社区的服务器，不能用于统计其他社区。
 */
const communityOnlineCountMap = computed(() => {
  const map = new Map<number, number>();
  gameStore.currentServerWsList.forEach(server => {
    const id = server.communityId;
    if (id == null) return;
    map.set(id, (map.get(id) ?? 0) + (server.numPlayers || 0));
  });
  return map;
});

/** 获取社区在线人数：实时汇总值，无玩家数据时显示 0 */
const getCommunityPlayerNumber = (community: Api.Game.Community) =>
  communityOnlineCountMap.value.get(community.id) ?? 0;

const handleSelect = (id: number) => {
  emit('select', id);
};
</script>

<template>
  <NCard class="m-10px w-380px rounded-10px max-w-[270px]" content-style="padding:10px;"
    content-class="h-full flex flex-col overflow-hidden" header-style="padding:10px 10px 0px 10px;">
    <template #header>
      <h3 class="text-lg font-bold mb-10px">{{ $t('server.communityList') }}</h3>
    </template>
    <div class="space-y-8px h-full overflow-y-auto pr-5px">
      <VueDraggable v-model="gameStore.communityList"
        v-on:update="gameStore.updateCommunityList(gameStore.communityList)">
        <div class="community-box mt-10px" :class="{ 'community-box-selected': props.selectedId === community.id }"
          :style="{ '--delay': `${Math.min(index * 0.05, 0.4)}s` }"
          v-for="(community, index) in gameStore.communityList" :key="community.id" @click="handleSelect(community.id)">
          <div class="drag-handle">
            <SvgIcon icon="material-symbols:drag-indicator" class="drag-icon" />
          </div>
          <div class="community-image">
            <img v-lazy="community.logo" :alt="community.communityName" v-if="community.logo" />
          </div>
          <div class="community-info">
            <div class="community-name">{{ community.communityName }}</div>
            <div class="community-stats">{{ $t('server.serverCount', { count: community.serverNumber }) }}</div>
          </div>
          <div class="community-online">
            <NTag :type="getCommunityTagType(getCommunityPlayerNumber(community))" class="rounded-md" size="small">
              {{ $t('server.playerCount', { count: getCommunityPlayerNumber(community) }) }}
            </NTag>
          </div>
        </div>
      </VueDraggable>
    </div>
  </NCard>
</template>

<style scoped lang="scss">
.community-box {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: rgba(133, 133, 133, 0.1);
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  cursor: pointer;
  // 进入动画：错落淡入上浮（与更新日志卡片一致）
  animation: fadeInUp 0.5s ease-out forwards;
  animation-delay: var(--delay, 0s);
  opacity: 0;

  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-right: 8px;
    cursor: grab;
    opacity: 0.5;
    transition: opacity 0.2s ease;
    flex-shrink: 0;

    &:hover {
      opacity: 1;
    }

    &:active {
      cursor: grabbing;
    }

    .drag-icon {
      font-size: 20px;
      color: #888;
    }
  }

  &:hover {
    background-color: rgba(133, 133, 133, 0.2);
    border-color: rgba(99, 102, 241, 0.6);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

    .drag-handle {
      opacity: 0.8;
    }
  }

  &.community-box-selected {
    background-color: rgba(99, 102, 241, 0.15);
    border-color: #6366f1;
  }
}

.ghost {
  opacity: 0.5;
  background: rgba(99, 102, 241, 0.2) !important;
  border-color: #6366f1 !important;
}

.community-image {
  flex-shrink: 0;
  margin-right: 12px;

  img {
    width: 40px;
    border-radius: 4px;
    object-fit: cover;
  }
}

.community-info {
  flex: 1;
  min-width: 0;
}

.community-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.community-stats {
  font-size: 10px;
  color: #666;
  font-weight: bold;
}

.community-online {
  flex-shrink: 0;
  text-align: center;
  margin-left: 12px;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
