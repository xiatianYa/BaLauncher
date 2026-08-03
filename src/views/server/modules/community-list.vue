<script setup lang="ts">
import { NCard, NTag } from 'naive-ui';
import { VueDraggable } from 'vue-draggable-plus';
import { useGameStore } from '@/store/modules/game';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { $t } from '@/locales';

const props = defineProps<{
  selectedId: number | null;
}>();

const emit = defineEmits<{
  (e: 'select', id: number): void;
}>();

const gameStore = useGameStore();

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
  <NCard class="m-10px w-380px rounded-10px max-w-[270px]" content-style="padding:10px;"
    content-class="h-full flex flex-col overflow-hidden" header-style="padding:10px 10px 0px 10px;">
    <template #header>
      <h3 class="text-lg font-bold mb-10px">{{ $t('server.communityList') }}</h3>
    </template>
    <div class="space-y-8px h-full overflow-y-auto pr-5px">
      <VueDraggable v-model="gameStore.communityList"
        v-on:update="gameStore.updateCommunityList(gameStore.communityList)">
        <div class="community-box mt-10px" :class="{ 'community-box-selected': props.selectedId === community.id }"
          v-for="community in gameStore.communityList" :key="community.id" @click="handleSelect(community.id)">
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
            <NTag :type="getCommunityTagType(community.playerNumber)" class="rounded-md" size="small">
              {{ $t('server.playerCount', { count: community.playerNumber }) }}
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
</style>
