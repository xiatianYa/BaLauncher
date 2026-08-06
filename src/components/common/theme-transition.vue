<script setup lang="ts">
import { onMounted } from 'vue';

interface Props {
  /** 旧主题背景色：作为遮罩填充，扫描环掠过后逐块露出新主题 */
  color: string;
  /** 扫描线光晕颜色 */
  accent?: string;
}

const props = withDefaults(defineProps<Props>(), {
  accent: '#667eea'
});

const emit = defineEmits<{ (e: 'finished'): void }>();

/** 与下方 CSS 动画时长一致（ms），扫描结束后通知父组件卸载 */
const ANIM_DURATION = 850;

onMounted(() => {
  setTimeout(() => emit('finished'), ANIM_DURATION);
});
</script>

<template>
  <!-- 圆形X光扫描：发光扫描环从窗口左下角扫向右上角，圆内露出新主题，圆外为旧主题色 -->
  <div
    class="theme-scan"
    :style="{
      '--scan-fill': color,
      '--accent': accent
    }"
  />
</template>

<style scoped>
/* 注册可插值的扫描圆心位置与半径：Chromium 按帧插值并重绘该渐变层，实现平滑的圆形扫描 */
@property --scan-cx {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 0%;
}

@property --scan-cy {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 100%;
}

@property --scan-r {
  syntax: '<length>';
  inherits: false;
  initial-value: 0px;
}

.theme-scan {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 100vw;
  z-index: 99999;
  pointer-events: none;
  /* 与窗口外角圆角一致，背景随圆角走，不会超出窗口 */
  border-radius: 12px;
  /* 圆形X光扫描：圆内透明（露出新主题），圆环为发光扫描线，圆外为旧主题色；
     渐变指定足够大的固定尺寸，保证圆环始终是完整正圆；
     圆心从窗口最左下角(0% 100%)开始，扫向右上角并扩大直至盖满全屏 */
  background: radial-gradient(
    250vmax 250vmax at var(--scan-cx) var(--scan-cy),
    transparent 0,
    transparent calc(var(--scan-r) - 6px),
    color-mix(in srgb, var(--accent) 35%, transparent) calc(var(--scan-r) - 5px),
    rgba(255, 255, 255, 0.95) calc(var(--scan-r) - 2px),
    rgba(255, 255, 255, 0.95) var(--scan-r),
    color-mix(in srgb, var(--accent) 35%, transparent) calc(var(--scan-r) + 1px),
    var(--scan-fill) calc(var(--scan-r) + 6px),
    var(--scan-fill) 100%
  );
  /* 一次性 800ms 主题切换动画，仅重绘该渐变层，开销可控 */
  animation: scan-sweep 800ms cubic-bezier(0.37, 0, 0.63, 1) both;
}

@keyframes scan-sweep {
  from {
    --scan-cx: 0%;
    --scan-cy: 100%;
    --scan-r: 80px;
  }

  to {
    --scan-cx: 100%;
    --scan-cy: 0%;
    --scan-r: 140vmax;
  }
}
</style>
