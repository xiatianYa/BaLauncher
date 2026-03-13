<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useAuthStore } from '@/store/modules/auth';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useI18n } from 'vue-i18n';

const authStore = useAuthStore();
const { t } = useI18n();

const { formRef, validate } = useNaiveForm();

interface FormModel {
  userName: string;
  password: string;
}

const model: FormModel = reactive({
  userName: '',
  password: ''
});

interface Account {
  label: string;
  icon: string;
  type: 'qq' | 'steam';
}

const accounts = computed<Account[]>(() => [
  {
    label: t('login.oauth.qq'),
    icon: 'basil:qq-outline',
    type: 'qq'
  },
  {
    label: t('login.oauth.steam'),
    icon: 'mdi:steam',
    type: 'steam'
  },
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

const rules = computed<Record<keyof FormModel, App.Global.FormRule[]>>(() => {
  const { formRules } = useFormRules();

  return {
    userName: formRules.userName,
    password: formRules.pwd
  };
});

async function handleSubmit() {
  await validate();
  loginLoading.value = true;
  await authStore.login(model.userName, model.password);
  loginLoading.value = false;
  //请求登录数据
  clearLoginModal();
}

function clearLoginModal() {
  model.userName = '';
  model.password = '';
}


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
</script>

<template>
  <NModal v-model:show="authStore.loginModalVisibel" preset="card" class="w-750px h-420px rounded-20px overflow-hidden"
    content-style="padding:0px;" :closable="false" :close-on-esc="false" :mask-closable="false">
    <div class="flex h-full">
      <div class="w-full h-full">
        <img class="w-full h-full object-cover brightness-80 bg-center bg-cover bg-no-repeat"
          src="@/assets/imgs/login_bg.jpg">
      </div>
      <div class="w-40% h-full p-15px">
        <span class="flex justify-center mb-10px font-size-22px font-bold">{{ $t('system.title') }}</span>
        <NForm ref="formRef" :model="model" :rules="rules">
          <NFormItem path="userName" :label="$t('login.form.userName.label')">
            <NInput v-model:value="model.userName" :placeholder="$t('login.form.userName.placeholder')" />
          </NFormItem>
          <NFormItem path="password" :label="$t('login.form.password.label')">
            <NInput v-model:value="model.password" type="password" show-password-on="click"
              :placeholder="$t('login.form.password.placeholder')" />
          </NFormItem>
          <NSpace vertical :size="15">
            <NButton type="primary" size="large" :loading="loginLoading" block @click="handleSubmit">
              {{ $t('login.actions.login') }}
            </NButton>
            <NButton block>
              {{ $t('login.actions.register') }}
            </NButton>
            <NDivider class="text-14px text-#666 !m-0">{{ $t('login.actions.otherMethods') }}</NDivider>
            <div class="flex justify-center gap-12px">
              <NButton v-for="item in accounts" :key="item.label" strong secondary circle type="default"
                @click="handleLogin(item.type)">
                <template #icon>
                  <SvgIcon :icon=item.icon></SvgIcon>
                </template>
              </NButton>
            </div>
          </NSpace>
        </NForm>
      </div>
    </div>
  </NModal>
</template>

<style scoped lang="scss"></style>
