<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { useGameStore } from '@/store/modules/game';
import { animate } from 'animejs';

defineOptions({
  name: 'setting'
});

const gameStore = useGameStore();

const titleRef = ref<HTMLElement | null>(null);
const isDetectingSteam = ref(false);
const isDetectingCsgo = ref(false);

const gamePlatform = computed({
  get: () => gameStore.gamePlatform,
  set: (val) => gameStore.setGamePlatform(val)
});

const csgo2Path = computed({
  get: () => gameStore.csgo2Path,
  set: (val) => gameStore.setCsgo2Path(val)
});

const steamPath = computed({
  get: () => gameStore.steamPath,
  set: (val) => gameStore.setSteamPath(val)
});

const selectCsgo2Path = async () => {
  const result = await window.ipcRenderer.invoke('select-directory', '选择CSGO2安装目录');
  if (result) {
    csgo2Path.value = result;
    window.$message?.success('CSGO2安装目录已保存');
  }
};

const selectSteamPath = async () => {
  const result = await window.ipcRenderer.invoke('select-directory', '选择Steam安装目录');
  if (result) {
    steamPath.value = result;
    window.$message?.success('Steam安装目录已保存');
  }
};

const autoDetectSteamPath = async () => {
  isDetectingSteam.value = true;
  try {
    const result = await window.ipcRenderer.invoke('auto-detect-paths');
    if (result.steamPath) {
      steamPath.value = result.steamPath;
      window.$message?.success('已自动配置Steam安装目录');
    } else {
      window.$message?.warning('未检测到Steam安装目录，请手动选择');
    }
  } catch (error) {
    window.$message?.error('自动检测失败，请手动选择');
  } finally {
    isDetectingSteam.value = false;
  }
};

const autoDetectCsgo2Path = async () => {
  isDetectingCsgo.value = true;
  try {
    const result = await window.ipcRenderer.invoke('auto-detect-paths');
    if (result.csgo2Path) {
      csgo2Path.value = result.csgo2Path;
      window.$message?.success('已自动配置CSGO2安装目录');
    } else {
      window.$message?.warning('未检测到CSGO2安装目录，请先设置Steam目录或手动选择');
    }
  } catch (error) {
    window.$message?.error('自动检测失败，请手动选择');
  } finally {
    isDetectingCsgo.value = false;
  }
};

const selectPlatform = (platform: 'international' | 'perfect') => {
  gamePlatform.value = platform;
};

onMounted(() => {
  nextTick(() => {
    if (titleRef.value) {
      const text = titleRef.value.textContent || '';
      titleRef.value.innerHTML = '';

      text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.className = 'title-char';
        span.style.opacity = '0';
        span.style.transform = 'translateY(-30px) rotate(-10deg)';
        titleRef.value!.appendChild(span);
      });

      animate(titleRef.value, {
        targets: '.title-char',
        translateY: [-30, 0],
        rotate: [-10, 0],
        opacity: [0, 1],
        delay: 80,
        duration: 800,
        easing: 'easeOutElastic(1, .8)'
      });
    }
  });
});
</script>

<template>
  <div class="w-full h-full">
    <NCard class="w-full h-full rounded-20px" content-class="w-full h-full overflow-y-auto"
      content-style="padding:10px 20px 10px 20px;" header-style="padding: 10px 20px 10px 20px;" :segmented="{
        content: true,
        footer: 'soft',
      }">
      <template #header>
        <div class="title-container">
          <div class="flex items-center">
            <div class="setting-icon">⚙️</div>
          </div>
          <h1 class="title-text text-20px font-bold bg-gradient-to-r bg-clip-text text-transparent ml-5px">
            <NText>
              系统设置
            </NText>
          </h1>
        </div>
      </template>
      <div class="game-setting-box">
        <div class="game-setting-title">
          <div class="flex font-size-24px">
            <SvgIcon icon="solar:gamepad-broken" />
          </div>
          <div class="ml-10px font-size-16px font-semibold">
            <NText>
              游戏设置
            </NText>
          </div>
        </div>
        <div class="game-setting-item mt-10px">
          <div class="font-size-14px font-semibold">
            <NText>
              启动平台
            </NText>
          </div>
          <div class="flex-1 ml-10px">
            <NButton class="mr-10px rounded-8px" :color="gamePlatform === 'international' ? '#18a058' : '#a5aaa3'" ghost
              size="large" @click="selectPlatform('international')">
              <template #icon>
                <SvgIcon icon="mdi:steam" />
              </template>
              国际服
            </NButton>
            <NButton class="rounded-8px" :color="gamePlatform === 'perfect' ? '#18a058' : '#a5aaa3'" ghost size="large"
              @click="selectPlatform('perfect')">
              <template #icon>
                <SvgIcon icon="mdi:earth" />
              </template>
              完美平台
            </NButton>
          </div>
        </div>
        <div class="game-setting-item mt-10px">
          <div class="font-size-14px font-semibold">
            <NText>
              游戏安装目录
            </NText>
          </div>
          <div class="flex-1 ml-10px">
            <NInput v-model:value="csgo2Path" placeholder="请输入CSGO2安装目录" :disabled="true" />
          </div>
          <div class="ml-10px">
            <NButton class="rounded-8px mr-10px" ghost @click="selectCsgo2Path">
              选择路径
            </NButton>
            <NButton class="rounded-8px" ghost @click="autoDetectCsgo2Path">
              自动检测
            </NButton>
          </div>
        </div>
        <div class="game-setting-item mt-10px">
          <div class="font-size-14px font-semibold">
            <NText>
              游戏安装目录
            </NText>
          </div>
          <div class="flex-1 ml-10px">
            <NInput v-model:value="steamPath" placeholder="请输入Steam安装目录" :disabled="true" />
          </div>
          <div class="ml-10px">
            <NButton class="rounded-8px mr-10px" ghost @click="selectSteamPath">
              选择路径
            </NButton>
            <NButton class="rounded-8px" ghost @click="autoDetectSteamPath">
              自动检测
            </NButton>
          </div>
        </div>
      </div>
      <div class="game-info-box">
        <div class="game-info-title">
          <div class="flex font-size-24px">
            <SvgIcon icon="solar:info-square-broken" />
          </div>
          <div class="ml-10px font-size-16px font-semibold">
            <NText>
              关于
            </NText>
          </div>
        </div>
        <div class="game-info-content mt-15px">
          <div class="auth-info">
            <div class="auth-icon">
              <SvgIcon icon="material-symbols:account-circle" />
            </div>
            <div class="auth-text">
              <div class="license">开发者</div>
              <div class="auth">夏天</div>
            </div>
          </div>
        </div>
        <div class="game-info-content mt-15px">
          <div class="version-info">
            <div class="version-icon">
              <SvgIcon icon="mdi:tag-multiple-outline" />
            </div>
            <div class="version-text">
              <div class="license">当前版本号</div>
              <div class="version">1.0.0</div>
            </div>
          </div>
        </div>
        <div class="game-info-content mt-15px">
          <div class="copyright-info">
            <div class="copyright-icon">
              <SvgIcon icon="mingcute:safe-shield-line" />
            </div>
            <div class="copyright-text">
              <div class="license">MIT License</div>
              <div class="copyright">Copyright © 2024-2026 夏天</div>
            </div>
          </div>
        </div>
      </div>
    </NCard>
  </div>
</template>

<style scoped lang="scss">
.title-container {
  display: flex;
  align-items: center;
  position: relative;

  .setting-icon {
    font-size: 24px;
    animation: rotate 10s linear infinite;
    display: inline-block;
  }

  .title-text {
    height: 100%;
    display: inline-flex;
    letter-spacing: 0.05em;

    .title-char {
      display: inline-block;
    }
  }
}

.game-setting-box {
  width: full;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.1);

  &:hover {
    border-color: rgba(139, 92, 246, 0.6);
    box-shadow: 0 6px 25px rgba(139, 92, 246, 0.2);
  }

  .game-setting-title {
    display: flex;
    align-items: center;
  }

  .game-setting-item {
    display: flex;
    align-items: center;
    padding: 10px 20px 10px 0px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.6);
  }
}

.game-info-box {
  width: full;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.1);

  &:hover {
    border-color: rgba(139, 92, 246, 0.6);
    box-shadow: 0 6px 25px rgba(139, 92, 246, 0.2);
  }

  .game-info-title {
    display: flex;
    align-items: center;
  }

  .game-info-content {
    padding: 10px;

    .auth-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 15px;
      background: rgba(165, 170, 1630, 0.2);
      border-radius: 10px;
      border-left: 2px solid #90cbfb;

      .auth-icon {
        font-size: 24px;
        display: flex;
        align-items: center;
      }

      .auth-text {
        flex: 1;

        .license {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 5px;

          &::before {
            content: '';
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #90cbfb;
          }
        }

        .auth {
          font-size: 13px;
          font-weight: 500;
        }
      }
    }

    .version-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 15px;
      background: rgba(165, 170, 1630, 0.2);
      border-radius: 10px;
      border-left: 2px solid #90cbfb;

      .version-icon {
        font-size: 24px;
        display: flex;
        align-items: center;
      }

      .version-text {
        flex: 1;

        .license {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 5px;

          &::before {
            content: '';
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #90cbfb;
          }
        }

        .version {
          font-size: 13px;
          font-weight: 500;
        }
      }
    }

    .copyright-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 15px;
      background: rgba(165, 170, 1630, 0.2);
      border-radius: 10px;
      border-left: 2px solid #90cbfb;

      .copyright-icon {
        font-size: 24px;
        display: flex;
        align-items: center;
      }

      .copyright-text {
        flex: 1;

        .license {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 5px;

          &::before {
            content: '';
            width: 6px;
            height: 6px;
            background: #90cbfb;
            border-radius: 50%;
          }
        }

        .copyright {
          font-size: 13px;
          font-weight: 500;
        }
      }
    }
  }

  .game-info-item {
    display: flex;
    align-items: center;
    padding: 10px 20px 10px 0px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.6);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
