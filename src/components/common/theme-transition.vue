<script setup lang="ts">
import { onMounted } from 'vue';

interface Props {
  /** 旧主题背景色：作为遮罩填充，扫描线掠过后逐列露出新主题 */
  color: string;
  /** 扫描线光晕颜色 */
  accent?: string;
}

const props = withDefaults(defineProps<Props>(), {
  accent: '#667eea'
});

const emit = defineEmits<{ (e: 'finished'): void }>();

/** 与下方 CSS 动画时长一致（ms），扫描结束后通知父组件卸载 */
const ANIM_DURATION = 750;

onMounted(() => {
  setTimeout(() => emit('finished'), ANIM_DURATION);
});
</script>

<template>
  <!-- X光扫描：旧主题色遮罩整体向右平移，其左边缘的发光扫描线逐列揭出新主题 -->
  <div
    class="theme-scan"
    :style="{
      '--scan-fill': color,
      '--accent': accent
    }"
  />
</template>

<style scoped>
.theme-scan {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 100vw;
  z-index: 99999;
  pointer-events: none;
  /* 扫描线收窄为细光条：轻光晕 → 白色核心 → 轻光晕 → 旧主题纯色 */
  background: linear-gradient(
    90deg,
    transparent 0px,
    color-mix(in srgb, var(--accent) 35%, transparent) 9px,
    rgba(255, 255, 255, 0.95) 10px,
    rgba(255, 255, 255, 0.95) 14px,
    color-mix(in srgb, var(--accent) 35%, transparent) 15px,
    var(--scan-fill) 19px,
    var(--scan-fill) 100%
  );
  animation: scan-sweep 700ms cubic-bezier(0.37, 0, 0.63, 1) both;
  will-change: transform;
}

/* 遮罩从屏幕最左平移出一个屏宽，扫描线随之从左扫到右 */
@keyframes scan-sweep {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(100vw);
  }
}
</style>
