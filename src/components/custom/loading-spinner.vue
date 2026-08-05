<script setup lang="ts">
import ALuoNa01 from '@/assets/imgs/ALuoNa01.png';
import ALuoNa02 from '@/assets/imgs/ALuoNa02.png';
import ALuoNa03 from '@/assets/imgs/ALuoNa03.png';
import ALuoNa04 from '@/assets/imgs/ALuoNa04.png';
import { ref, onMounted, onUnmounted, watch } from 'vue';

defineOptions({
  name: 'LoadingSpinner'
});

const props = withDefaults(defineProps<{
  loading: boolean;
}>(), {
  loading: false
});

const currentIndex = ref(0);
const images = [ALuoNa01, ALuoNa02, ALuoNa03, ALuoNa04];
let intervalId: number | null = null;

const startAnimation = () => {
  if (intervalId) return;
  intervalId = window.setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % images.length;
  }, 1000);
};

const stopAnimation = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};



onMounted(() => {
  if (props.loading) {
    startAnimation();
  }
});

onUnmounted(() => {
  stopAnimation();
});

watch(() => props.loading, (newVal) => {
  if (newVal) {
    startAnimation();
  } else {
    stopAnimation();
  }
});
</script>

<template>
  <div v-if="props.loading" class="loading-spinner-wrap">
    <div class="loading-spinner-container">
      <div class="loading-content">
        <img :src="images[currentIndex]" class="loading-spinner-image" />
        <NText class="loading-text">{{ $t('common.loading') }}</NText>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.loading-spinner-wrap {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loading-spinner-image {
  width: 150px;
  height: 225px;
  object-fit: contain;
  animation: float 2.5s ease-in-out infinite;
  filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.3));
}

.loading-text {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 2px;
  color: rgba(var(--app-rgb), 0.9);
  text-shadow:
    0 0 8px rgba(var(--app-rgb), 0.4),
    0 2px 4px rgba(0, 0, 0, 0.5);
  animation: pulse 1.8s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }

  50% {
    transform: translateY(-16px) scale(1.02);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}
</style>
