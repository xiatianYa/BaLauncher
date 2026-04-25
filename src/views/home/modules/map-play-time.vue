<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { fetchGetMapPlayCountList } from '@/service/api';
import { useThemeStore } from '@/store/modules/theme';
import SvgIcon from '@/components/custom/svg-icon.vue';

const themeStore = useThemeStore();
const isDarkMode = computed(() => themeStore.darkMode);

const mapPlayCountList = ref<Api.Game.GameMapPlayCountVo[]>([]);

const rankColors = ['#ff4d4f', '#faad14', '#52c41a', '#4096ff', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

const formatPlayCount = (count: number): string => {
    if (count >= 10000) {
        const w = count / 10000;
        return w.toFixed(1) + '万次';
    } else if (count >= 1000) {
        const k = count / 1000;
        return k.toFixed(1) + 'k次';
    }
    return count + '次';
};

const sortedMapList = computed(() => {
    return [...mapPlayCountList.value]
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, 100);
});

onMounted(async () => {
    const { data, error } = await fetchGetMapPlayCountList();
    if (!error && data) {
        mapPlayCountList.value = data;
    }
});
</script>

<template>
    <NCard :bordered="true" size="small" class="card-wrapper h-400px" content-class="flex overflow-auto"
        content-style="padding:10px 10px 10px 10px" header-style="padding:5px 10px 5px 10px;">
        <div class="space-y-12px w-full">
            <div v-for="(item, index) in sortedMapList" :key="item.mapId || index"
                class="flex items-center gap-12px p-12px rounded-12px transition-all duration-300 overflow-hidden relative" :class="{
                    'hover:translate-x-4px cursor-pointer': true
                }" :style="{
                    backgroundColor: index < 5 && item.mapUrl ? 'transparent' : (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)')
                }">
                <img v-if="index < 5 && item.mapUrl" :src="item.mapUrl" :alt="item.mapName"
                    class="absolute inset-0 w-full h-full object-cover opacity-50" />
                <div v-if="index < 5 && item.mapUrl" class="absolute inset-0" :style="{
                    background: isDarkMode ? 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 100%)' : 'linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.4) 100%)'
                }"></div>
                <div class="relative z-10 flex items-center gap-12px w-full">
                    <div class="flex items-center justify-center w-32px h-32px rounded-8px font-bold text-14px" :style="{
                        backgroundColor: index < 3 ? rankColors[index] : (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'),
                        color: index < 3 ? '#fff' : (isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)')
                    }">
                        <span v-if="index === 0" class="text-16px">🥇</span>
                        <span v-else-if="index === 1" class="text-16px">🥈</span>
                        <span v-else-if="index === 2" class="text-16px">🥉</span>
                        <span v-else>{{ index + 1 }}</span>
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-8px mb-4px">
                            <span class="font-bold text-14px truncate" :style="{ color: isDarkMode ? '#fff' : '#333' }">
                                {{ item.mapLabel || item.mapName }}
                            </span>
                        </div>
                        <div class="flex items-center gap-8px">
                            <SvgIcon v-if="item.mapUrl" icon="material-symbols:map-outline" class="font-size-12px"
                                :style="{ color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)' }" />
                            <span class="text-12px"
                                :style="{ color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)' }">
                                {{ item.mapName }}
                            </span>
                        </div>
                    </div>

                    <div class="flex items-center gap-8px">
                        <div class="text-right">
                            <div class="font-bold text-12px" :style="{ color: rankColors[index] }">
                                {{ formatPlayCount(item.playCount || 0) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </NCard>
</template>

<style scoped lang="scss"></style>
