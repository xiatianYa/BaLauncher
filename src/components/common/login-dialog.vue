<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useAuthStore } from '@/store/modules/auth';
import { useI18n } from 'vue-i18n';
import { setLocale } from '@/locales';

const authStore = useAuthStore();
const { locale, t } = useI18n();

const langOptions = computed<{ label: string; key: App.I18n.LangType; icon: string }[]>(() => [
  { label: t('settings.langOptions.zhCN'), key: 'zh-CN', icon: 'mdi:translate' },
  { label: t('settings.langOptions.enUS'), key: 'en-US', icon: 'mdi:translate' }
]);

/** 当前语言显示文案 */
const currentLangLabel = computed(() => {
  const cur = locale.value;
  return langOptions.value.find(o => o.key === cur)?.label || '';
});

/* ===== 自定义语言下拉 ===== */

/** 下拉菜单展开状态 */
const langMenuVisible = ref(false);
/** 下拉容器引用（用于点击外部关闭） */
const langDropdownRef = ref<HTMLElement | null>(null);

/** 切换下拉菜单显示 */
const toggleLangMenu = () => {
  langMenuVisible.value = !langMenuVisible.value;
};

/** 选择语言 */
const handleLangChange = (val: App.I18n.LangType) => {
  setLocale(val);
  langMenuVisible.value = false;
};

/** 点击外部关闭下拉 */
const handleClickOutside = (e: MouseEvent) => {
  if (langDropdownRef.value && !langDropdownRef.value.contains(e.target as Node)) {
    langMenuVisible.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

interface Account {
  label: string;
  icon: string;
  type: 'qq' | 'steam';
  desc: string;
}

const accounts = computed<Account[]>(() => [
  {
    label: t('login.oauth.qq'),
    icon: 'basil:qq-outline',
    type: 'qq',
    desc: '使用 QQ 账号快速登录'
  },
  {
    label: t('login.oauth.steam'),
    icon: 'mdi:steam',
    type: 'steam',
    desc: '使用 Steam 账号快速登录'
  }
]);

// 配置参数
const qqConfig = {
  appId: '102129326',
  redirectURI: 'https://www.bluearchive.top/main',
  responseType: 'code',
  scope: 'get_user_info'
};

const steamConfig = {
  realm: 'https://www.bluearchive.top',
  returnTo: 'https://www.bluearchive.top/main'
};

const loginLoading = ref<boolean>(false);

const generateState = () => {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
};

const getQQLoginUrl = () => {
  const baseUrl = 'https://graph.qq.com/oauth2.0/authorize';
  const params = new URLSearchParams({
    client_id: qqConfig.appId,
    redirect_uri: qqConfig.redirectURI,
    response_type: qqConfig.responseType,
    scope: qqConfig.scope,
    state: generateState()
  });
  return `${baseUrl}?${params.toString()}`;
};

const getSteamLoginUrl = () => {
  const baseUrl = 'https://steamcommunity.com/openid/login';
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': steamConfig.returnTo,
    'openid.realm': steamConfig.realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
  });
  return `${baseUrl}?${params.toString()}`;
};

function handleLogin(type: 'qq' | 'steam') {
  loginLoading.value = true;
  const url = type === 'qq' ? getQQLoginUrl() : getSteamLoginUrl();
  const ipcChannel = type === 'qq' ? 'open-qq-login-window' : 'open-steam-login-window';

  window.ipcRenderer.invoke(ipcChannel, url)
    .then(async data => {
      if (data) {
        if (type === 'qq') {
          const { accessToken, openid } = data;
          await authStore.oAuthLogin({ accessToken, openId: openid, type: 0, redirect: false });
        } else {
          const { steamId } = data;
          await authStore.oAuthLogin({ accessToken: '', openId: steamId, type: 1, redirect: false });
        }
      }
      loginLoading.value = false;
    })
    .catch(() => {
      loginLoading.value = false;
    });
}

/** 打开用户协议 / 隐私政策窗口 */
const openAgreement = (type: 'user' | 'privacy') => {
  window.ipcRenderer.invoke('open-agreement-window', type).catch(() => {});
};
</script>

<template>
  <NModal v-model:show="authStore.loginModalVisibel" class="login-modal w-880px" :bordered="false" :closable="false"
    :close-on-esc="false" :mask-closable="false">
    <div class="login-body">
      <!-- 左侧：背景图 + 品牌标语 -->
      <div class="login-bg-panel">
        <img class="login-bg-img" src="@/assets/imgs/login_bg.jpg" alt="login-bg">
        <div class="bg-overlay" />
        <div class="bg-content">
          <div class="bg-logo">
            <SvgIcon icon="mdi:shield-star" class="bg-logo-icon" />
          </div>
          <h2 class="bg-title">Blue Archive</h2>
          <p class="bg-subtitle">Launcher</p>
          <div class="bg-divider" />
          <p class="bg-desc">登录后即可体验完整的社区服务</p>
        </div>
      </div>

      <!-- 右侧：登录面板 -->
      <div class="login-panel">
        <div class="lang-dropdown" ref="langDropdownRef">
          <div class="lang-switch" @click.stop="toggleLangMenu">
            <SvgIcon icon="lucide:languages" class="lang-switch-icon" />
            <span class="lang-switch-text">{{ currentLangLabel }}</span>
            <SvgIcon icon="mdi:chevron-down" class="lang-switch-arrow" :class="{ open: langMenuVisible }" />
          </div>

          <!-- 自定义语言下拉面板 -->
          <transition name="lang-menu-fade">
            <div v-if="langMenuVisible" class="lang-menu">
              <div v-for="option in langOptions" :key="option.key" class="lang-menu-item"
                :class="{ selected: locale === option.key }" @click="handleLangChange(option.key)">
                <SvgIcon :icon="option.icon" class="lang-menu-item-icon" />
                <span class="lang-menu-item-text">{{ option.label }}</span>
                <SvgIcon v-if="locale === option.key" icon="mdi:check" class="lang-menu-item-check" />
              </div>
            </div>
          </transition>
        </div>

        <div class="panel-header">
          <h2 class="panel-title">{{ $t('system.title') }}</h2>
          <p class="panel-subtitle">欢迎回来，请选择登录方式</p>
        </div>

        <div class="provider-list">
          <button v-for="item in accounts" :key="item.type" class="provider-btn" :class="item.type"
            :disabled="loginLoading" @click="handleLogin(item.type)">
            <div class="provider-icon">
              <SvgIcon :icon="item.icon" />
            </div>
            <div class="provider-info">
              <span class="provider-name">{{ item.label }} 登录</span>
              <span class="provider-desc">{{ item.desc }}</span>
            </div>
            <SvgIcon icon="mdi:chevron-right" class="provider-arrow" />
          </button>
        </div>

        <div class="panel-footer">
          <NDivider class="footer-divider">{{ $t('login.actions.otherMethods') }}</NDivider>
          <p class="footer-tip">
            登录即代表同意
            <span class="agreement-link" @click="openAgreement('user')">《用户协议》</span>
            与
            <span class="agreement-link" @click="openAgreement('privacy')">《隐私政策》</span>
          </p>
        </div>
      </div>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.login-modal {
  width: 880px;
  max-width: 92vw;
  border-radius: 20px;
  overflow: hidden;
  background: transparent;
  border: none;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
}

.login-body {
  display: flex;
  height: 500px;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(22, 26, 38, 0.95);
}

/* ---------- 左侧：背景图 + 品牌标语 ---------- */
.login-bg-panel {
  position: relative;
  flex: 0 0 52%;
  overflow: hidden;

  .login-bg-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .bg-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(15, 18, 30, 0.2) 0%, rgba(15, 18, 30, 0.7) 100%);
  }

  .bg-content {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 24px;
    text-align: center;

    .bg-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      margin-bottom: 6px;
      border-radius: 18px;
      background: rgba(102, 126, 234, 0.22);
      border: 1px solid rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(8px);

      .bg-logo-icon {
        font-size: 34px;
        color: #fff;
      }
    }

    .bg-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #fff;
      text-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
    }

    .bg-subtitle {
      margin: 0;
      font-size: 13px;
      letter-spacing: 5px;
      color: rgba(255, 255, 255, 0.75);
      text-transform: uppercase;
    }

    .bg-divider {
      width: 48px;
      height: 2px;
      margin: 8px 0;
      border-radius: 2px;
      background: linear-gradient(90deg, #667eea, #764ba2);
    }

    .bg-desc {
      margin: 0;
      font-size: 12.5px;
      color: rgba(255, 255, 255, 0.55);
    }
  }
}

/* ---------- 右侧：登录面板 ---------- */
.login-panel {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 34px 36px 26px;

  .lang-dropdown {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 10;

    .lang-switch {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 9px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.65);
      cursor: pointer;
      transition: all 0.25s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        border-color: rgba(102, 126, 234, 0.4);
        transform: translateY(-1px);

        .lang-switch-arrow {
          color: #667eea;
        }
      }

      .lang-switch-icon {
        font-size: 15px;
        color: #667eea;
        flex-shrink: 0;
      }

      .lang-switch-text {
        font-size: 12.5px;
        font-weight: 500;
        white-space: nowrap;
      }

      .lang-switch-arrow {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.35);
        transition: all 0.25s ease;
        flex-shrink: 0;

        &.open {
          color: #667eea;
          transform: rotate(180deg);
        }
      }
    }

    /* 自定义语言下拉面板 */
    .lang-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 100%;
      padding: 6px;
      border-radius: 12px;
      background: rgba(26, 30, 44, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
      z-index: 20;

      .lang-menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(102, 126, 234, 0.15);
        }

        &.selected {
          background: rgba(102, 126, 234, 0.12);

          .lang-menu-item-text {
            color: #667eea;
          }
        }

        .lang-menu-item-icon {
          font-size: 15px;
          color: #667eea;
          flex-shrink: 0;
        }

        .lang-menu-item-text {
          flex: 1;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.85);
          white-space: nowrap;
        }

        .lang-menu-item-check {
          font-size: 15px;
          color: #667eea;
          flex-shrink: 0;
        }
      }
    }

    /* 下拉展开/收起动画 */
    .lang-menu-fade-enter-active,
    .lang-menu-fade-leave-active {
      transition: all 0.2s ease;
      transform-origin: top right;
    }

    .lang-menu-fade-enter-from,
    .lang-menu-fade-leave-to {
      opacity: 0;
      transform: translateY(-6px) scale(0.96);
    }
  }

  .panel-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 28px;

    .panel-title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.92);
    }

    .panel-subtitle {
      margin: 0;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.45);
    }
  }

  .provider-list {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .provider-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 16px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.04);
      cursor: pointer;
      text-align: left;
      transition: all 0.25s ease;

      &:hover {
        transform: translateY(-2px);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .provider-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 10px;
        font-size: 22px;
        flex-shrink: 0;
      }

      .provider-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;

        .provider-name {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.88);
        }

        .provider-desc {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
        }
      }

      .provider-arrow {
        font-size: 18px;
        color: rgba(255, 255, 255, 0.25);
        transition: all 0.25s ease;
      }

      &.qq {
        .provider-icon {
          color: #12b7f5;
          background: rgba(18, 183, 245, 0.1);
        }

        &:hover {
          background: rgba(18, 183, 245, 0.08);
          border-color: rgba(18, 183, 245, 0.35);

          .provider-arrow {
            color: #12b7f5;
          }
        }
      }

      &.steam {
        .provider-icon {
          color: #66c0f4;
          background: rgba(102, 192, 244, 0.1);
        }

        &:hover {
          background: rgba(102, 192, 244, 0.08);
          border-color: rgba(102, 192, 244, 0.35);

          .provider-arrow {
            color: #66c0f4;
          }
        }
      }
    }
  }

  .panel-footer {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;

    .footer-divider {
      color: rgba(255, 255, 255, 0.35);
      font-size: 12px;
    }

    .footer-tip {
      margin: 0;
      text-align: center;
      font-size: 11.5px;
      color: rgba(255, 255, 255, 0.3);

      .agreement-link {
        color: #667eea;
        cursor: pointer;
        transition: color 0.2s;

        &:hover {
          color: #8aa0ff;
          text-decoration: underline;
        }
      }
    }
  }
}
</style>
