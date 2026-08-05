<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import { useBotBind } from '@/hooks/business/botBind';
import { fetchGetBindToken } from '@/service/api';
import { $t } from '@/locales';

defineOptions({
  name: 'BotBindModal'
});

const { bindModalVisible, checking, checkBound, closeBindModal } = useBotBind();

const bindToken = ref('');
const tokenLoading = ref(false);

let pollTimer: ReturnType<typeof setInterval> | null = null;

/** 获取绑定令牌 */
const fetchToken = async () => {
  tokenLoading.value = true;
  try {
    const { data, error } = await fetchGetBindToken();
    if (!error && data) {
      bindToken.value = data;
    }
  } finally {
    tokenLoading.value = false;
  }
};

/** 复制完整绑定指令（用户绑定 + 令牌） */
const copyCommand = async () => {
  if (!bindToken.value) {
    return;
  }
  await navigator.clipboard.writeText(`用户绑定 ${bindToken.value}`);
  window.$message?.success($t('tools.botBind.copySuccess'));
};

/** 手动检查是否已绑定 */
const handleCheckBound = async () => {
  const bound = await checkBound();
  if (bound) {
    window.$message?.success($t('tools.botBind.bindSuccess'));
    closeBindModal();
  } else {
    window.$message?.warning($t('tools.botBind.notBoundYet'));
  }
};

// 打开期间轮询检测，绑定成功后自动关闭
watch(bindModalVisible, visible => {
  if (visible) {
    fetchToken();
    pollTimer = setInterval(async () => {
      const bound = await checkBound();
      if (bound) {
        window.$message?.success($t('tools.botBind.bindSuccess'));
        closeBindModal();
      }
    }, 3000);
  } else if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});
</script>

<template>
  <NModal v-model:show="bindModalVisible" preset="card" class="bind-modal rounded-16px w-520px"
    :bordered="false" size="small" :closable="true">
    <template #header>
      <div class="bind-modal-header">
        <SvgIcon icon="mdi:link-variant" class="bind-modal-icon" />
        <span>{{ $t('tools.botBind.title') }}</span>
      </div>
    </template>
    <div class="bind-modal-body">
      <p class="bind-modal-desc">{{ $t('tools.botBind.desc') }}</p>

      <div class="bind-steps">
        <div class="bind-step">
          <span class="step-index">1</span>
          <span class="step-text">{{ $t('tools.botBind.step1') }}</span>
        </div>
        <div class="bind-step">
          <span class="step-index">2</span>
          <span class="step-text">{{ $t('tools.botBind.step2') }}</span>
        </div>
        <div class="bind-step">
          <span class="step-index">3</span>
          <span class="step-text">{{ $t('tools.botBind.step3') }}</span>
        </div>
      </div>

      <div class="token-box">
        <NInput :value="bindToken" readonly placeholder="---" class="token-input" :loading="tokenLoading" />
        <div class="token-actions">
          <button class="token-btn" :disabled="tokenLoading" @click="fetchToken">
            <SvgIcon icon="mdi:refresh" />
            <span>{{ $t('tools.botBind.refresh') }}</span>
          </button>
          <button class="token-btn" :disabled="!bindToken || tokenLoading" @click="copyCommand">
            <SvgIcon icon="mdi:message-text" />
            <span>{{ $t('tools.botBind.copyCommand') }}</span>
          </button>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="bind-modal-actions">
        <button class="bind-btn cancel" :disabled="checking" @click="closeBindModal">
          <SvgIcon icon="material-symbols:close" />
          <span>{{ $t('tools.botBind.cancel') }}</span>
        </button>
        <button class="bind-btn primary" :disabled="checking" @click="handleCheckBound">
          <SvgIcon icon="material-symbols:check" />
          <span>{{ checking ? $t('tools.botBind.checking') : $t('tools.botBind.confirm') }}</span>
        </button>
      </div>
    </template>
  </NModal>
</template>

<style scoped lang="scss">
.bind-modal {
  .bind-modal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color);

    .bind-modal-icon {
      font-size: 20px;
      color: #4facfe;
    }
  }

  .bind-modal-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 4px 0 16px;

    .bind-modal-desc {
      margin: 0;
      font-size: 13px;
      line-height: 1.6;
      color: rgba(var(--app-rgb), 0.65);
    }

    .bind-steps {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .bind-step {
        display: flex;
        align-items: center;
        gap: 8px;

        .step-index {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
          color: #fff;
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        .step-text {
          font-size: 13px;
          line-height: 1.5;
          color: rgba(var(--app-rgb), 0.85);
        }
      }
    }

    .token-box {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .token-input {
        flex: 1;

        :deep(.n-input__input-el) {
          font-family: 'Consolas', 'Courier New', monospace;
          font-size: 12.5px;
        }
      }

      .token-actions {
        display: flex;
        gap: 8px;
      }

      .token-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 0 12px;
        border: 1px solid rgba(var(--app-rgb), 0.08);
        border-radius: 8px;
        cursor: pointer;
        font-size: 12.5px;
        white-space: nowrap;
        transition: all 0.2s ease;
        background: rgba(var(--app-rgb), 0.06);
        color: rgba(var(--app-rgb), 0.8);

        &:hover {
          background: rgba(var(--app-rgb), 0.12);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  }

  // 底部按钮（参考 keyBind 天蓝品牌色风格）
  .bind-modal-actions {
    display: flex;
    gap: 10px;

    .bind-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      flex: 1;
      padding: 9px 2px;
      border: none;
      border-radius: 9px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &.cancel {
        color: #4b9ef8;
        background: rgba(75, 158, 248, 0.15);
        border: 1px solid rgba(var(--app-rgb), 0.1);

        &:hover:not(:disabled) {
          background: rgba(75, 158, 248, 0.3);
        }
      }

      &.primary {
        color: #fff;
        background: linear-gradient(135deg, #4b9ef8 0%, #3a86e0 100%);
        box-shadow: 0 4px 12px rgba(75, 158, 248, 0.35);

        &:hover:not(:disabled) {
          opacity: 0.9;
        }
      }
    }
  }

}
</style>
