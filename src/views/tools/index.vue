<script setup lang="ts">
import { NGrid, NGridItem, NCard } from 'naive-ui';

defineOptions({
  name: 'tools'
});
</script>

<template>
  <NCard class="w-full h-full" content-class="flex h-full" content-style="padding:0px;" :bordered="false">
    <NCard class="m-10px rounded-10px" content-style="padding:0px;" :bordered="true"
      content-class="h-full flex flex-col flex-1 overflow-hidden" header-style="padding:10px 20px 10px 20px" :segmented="{
        content: true,
        footer: 'soft',
      }">
      <template #header>
        <div class="relative">
          <div class="flex items-center mb-5px">
            <h1 class="text-18px font-bold mr-2">{{ $t('tools.title') }}</h1>
            <SvgIcon icon="gg:toolbox" class="text-20px" />
          </div>
          <div class="text-12px color-#666 font-bold">{{ $t('tools.subtitle') }}</div>
        </div>
      </template>
      <!-- Tools Grid -->
      <div class="relative px-4 pb-4">
        <NGrid :x-gap="24" :y-gap="24" :cols="4" responsive="screen" item-responsive>
          <NGridItem span="4 s:2 m:1 l:1">
          </NGridItem>
        </NGrid>
      </div>
    </NCard>
  </NCard>
</template>

<style scoped lang="scss"></style>
