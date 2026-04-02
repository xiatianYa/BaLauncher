<script setup lang="ts">
import { NCard, NTag, NModal, NInput, NButton } from 'naive-ui';
import { VueDraggable } from 'vue-draggable-plus';
import { useGameStore } from '@/store/modules/game';
import { ref } from 'vue';
import SvgIcon from '@/components/custom/svg-icon.vue';
import { $t } from '@/locales';

const props = defineProps<{
  selectedId: number | null;
}>();

const emit = defineEmits<{
  (e: 'select', id: number): void;
}>();

const gameStore = useGameStore();

const showAddCategoryModal = ref(false);
const showEditCategoryModal = ref(false);
const categoryName = ref('');
const editingCategoryId = ref<number | null>(null);

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

const handleAddCommunity = () => {
  showAddCategoryModal.value = true;
};

const closeAddCategoryModal = () => {
  showAddCategoryModal.value = false;
  categoryName.value = '';
};

const saveAddCategory = () => {
  if (!categoryName.value.trim()) {
    window.$message?.error($t('server.pleaseEnterCategoryName'));
    return;
  }
  gameStore.addCustomCategory(categoryName.value.trim());
  window.$message?.success($t('server.categoryAdded'));
  closeAddCategoryModal();
};

const handleEditCategory = (community: Api.Game.Community, event: Event) => {
  event.stopPropagation();
  editingCategoryId.value = community.id;
  categoryName.value = community.communityName;
  showEditCategoryModal.value = true;
};

const closeEditCategoryModal = () => {
  showEditCategoryModal.value = false;
  categoryName.value = '';
  editingCategoryId.value = null;
};

const saveEditCategory = () => {
  if (!categoryName.value.trim()) {
    window.$message?.error($t('server.pleaseEnterCategoryName'));
    return;
  }
  if (editingCategoryId.value !== null) {
    gameStore.editCustomCategory(editingCategoryId.value, categoryName.value.trim());
    window.$message?.success($t('server.categoryEdited'));
  }
  closeEditCategoryModal();
};

const handleDeleteCategory = (community: Api.Game.Community, event: Event) => {
  event.stopPropagation();
  gameStore.removeCustomCategory(community.id);
  window.$message?.success($t('server.categoryDeleted'));
};
</script>

<template>
  <NCard class="m-10px w-380px rounded-10px" content-style="padding:10px;"
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
          <div v-if="!gameStore.isCustomCategory(community.id)" class="community-online">
            <NTag :type="getCommunityTagType(community.playerNumber)" class="rounded-md" size="small">
              {{ $t('server.playerCount', { count: community.playerNumber }) }}
            </NTag>
          </div>
          <div v-else class="custom-category-actions">
            <NButton quaternary size="small" class="edit-btn" @click="handleEditCategory(community, $event)">
              <template #icon>
                <SvgIcon icon="mdi:pencil-outline" />
              </template>
            </NButton>
            <NButton quaternary size="small" class="delete-btn" @click="handleDeleteCategory(community, $event)">
              <template #icon>
                <SvgIcon icon="mdi:delete-outline" />
              </template>
            </NButton>
          </div>
        </div>
      </VueDraggable>
      <NCard class="rounded-8px add-community-card cursor-pointer mt-10px" content-style="padding:5px"
        content-class="flex flex-col items-center justify-center" @click="handleAddCommunity">
        <SvgIcon icon="material-symbols:add" />
        <span class="text-12px text-gray-400">{{ $t('server.addCustomCategory') }}</span>
      </NCard>
    </div>
  </NCard>
  <NModal v-model:show="showAddCategoryModal" :bordered="true" preset="card" class="w-500px rounded-10px"
    :closable="false" size="medium">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="text-lg font-bold">{{ $t('server.addCustomCategory') }}</div>
        <NButton quaternary size="tiny" @click="closeAddCategoryModal">
          <SvgIcon icon="material-symbols:close" />
        </NButton>
      </div>
    </template>
    <div class="pt-20px pb-20px pl-20px pr-20px">
      <div class="mb-15px text-sm text-gray-500">{{ $t('server.customCategoryDesc') }}</div>
      <div class="mb-20px">
        <NInput v-model:value="categoryName" :placeholder="$t('server.categoryNamePlaceholder')">
          <template #prefix>
            <SvgIcon icon="material-symbols:create-new-folder-outline" />
          </template>
        </NInput>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end items-center gap-10px">
        <NButton type="warning" class="rounded-8px" ghost @click="closeAddCategoryModal">
          <template #icon>
            <SvgIcon icon="material-symbols:close" />
          </template>
          {{ $t('server.cancel') }}
        </NButton>
        <NButton type="info" class="rounded-8px" ghost @click="saveAddCategory">
          <template #icon>
            <SvgIcon icon="material-symbols:check" />
          </template>
          {{ $t('server.add') }}
        </NButton>
      </div>
    </template>
  </NModal>
  <!-- 编辑自定义服务器弹窗 -->
  <NModal v-model:show="showEditCategoryModal" :bordered="true" preset="card" class="w-500px rounded-10px"
    :closable="false" size="medium">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="text-lg font-bold">{{ $t('server.editCategoryTitle') }}</div>
        <NButton quaternary size="tiny" @click="closeEditCategoryModal">
          <SvgIcon icon="material-symbols:close" />
        </NButton>
      </div>
    </template>
    <div class="pt-20px pb-20px pl-20px pr-20px">
      <div class="mb-15px text-sm text-gray-500">{{ $t('server.customCategoryDesc') }}</div>
      <div class="mb-20px">
        <NInput v-model:value="categoryName" :placeholder="$t('server.categoryNamePlaceholder')" clearable
          maxlength="10">
          <template #prefix>
            <SvgIcon icon="material-symbols:create-new-folder-outline" />
          </template>
        </NInput>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end items-center gap-10px">
        <NButton type="warning" class="rounded-8px" ghost @click="closeEditCategoryModal">
          <template #icon>
            <SvgIcon icon="material-symbols:close" />
          </template>
          {{ $t('server.cancel') }}
        </NButton>
        <NButton type="info" class="rounded-8px" ghost @click="saveEditCategory">
          <template #icon>
            <SvgIcon icon="material-symbols:check" />
          </template>
          {{ $t('server.edit') }}
        </NButton>
      </div>
    </template>
  </NModal>
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

.custom-category-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;

  .edit-btn {
    color: #3b82f6;

    &:hover {
      background-color: rgba(59, 130, 246, 0.1) !important;
    }
  }

  .delete-btn {
    color: #ef4444;

    &:hover {
      background-color: rgba(239, 68, 68, 0.1) !important;
    }
  }
}

.add-community-card {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  background-color: rgba(133, 133, 133, 0.1) !important;
  border: 2px dashed rgba(133, 133, 133, 0.3) !important;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(133, 133, 133, 0.2) !important;
    border-color: rgba(99, 102, 241, 0.5) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}
</style>
