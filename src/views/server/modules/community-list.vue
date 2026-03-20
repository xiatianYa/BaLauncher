<script setup lang="ts">
import { NCard, NTag } from 'naive-ui';

interface Community {
  id: number;
  communityName: string;
  logo?: string;
  serverNumber: number;
  playerNumber: number;
}

defineProps<{
  communities: Community[];
  selectedId: number | null;
}>();

const emit = defineEmits<{
  (e: 'select', id: number): void;
}>();

// 计算社区标签颜色
const getCommunityTagType = (playerNumber: number) => {
  if (playerNumber < 300) {
    return 'success';
  } else if (playerNumber < 500) {
    return 'warning';
  } else {
    return 'error';
  }
};

const handleSelect = (id: number) => {
  emit('select', id);
};
</script>

<template>
  <NCard class="m-10px w-380px rounded-10px" content-style="padding:10px;" content-class="h-full flex flex-col overflow-hidden" header-style="padding:10px 10px 0px 10px;">
    <template #header>
      <h3 class="text-lg font-bold mb-10px">{{ $t('server.communityList') }}</h3>
    </template>
    <div class="space-y-8px h-full overflow-y-auto pr-5px">
      <div
        v-for="community in communities"
        :key="community.id"
        class="community-box"
        :class="{ 'community-box-selected': selectedId === community.id }"
        @click="handleSelect(community.id)"
      >
        <div class="community-image">
          <img v-lazy="community.logo" :alt="community.communityName" v-if="community.logo" />
        </div>
        <div class="community-info">
          <div class="community-name">{{ community.communityName }}</div>
          <div class="community-stats">{{ $t('server.serverCount', { count: community.serverNumber }) }}</div>
        </div>
        <div class="community-online">
          <NTag :type="getCommunityTagType(community.playerNumber)" class="rounded-md" size="small">
            {{ $t('server.playerCount', { count: community.playerNumber }) }}
          </NTag>
        </div>
      </div>
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

  &:hover {
    background-color: rgba(133, 133, 133, 0.2);
    border-color: rgba(99, 102, 241, 0.6);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &.community-box-selected {
    background-color: rgba(99, 102, 241, 0.15);
    border-color: #6366f1;
  }
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
</style>
