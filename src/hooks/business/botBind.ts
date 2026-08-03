import { ref } from 'vue';
import { fetchBotGroupMemberIsBound } from '@/service/api';

/** 当前用户是否已绑定群成员（null 表示尚未检测） */
const isBound = ref<boolean | null>(null);
/** 绑定检测中 */
const checking = ref(false);
/** 绑定模态框显隐（模块级单例，全局共享） */
const bindModalVisible = ref(false);

export function useBotBind() {
  /** 检测当前登录用户是否已绑定群成员 */
  async function checkBound(): Promise<boolean> {
    checking.value = true;
    try {
      const { data, error } = await fetchBotGroupMemberIsBound();
      isBound.value = !error && data === true;
      return isBound.value;
    } finally {
      checking.value = false;
    }
  }

  /** 确保已绑定：未绑定则弹出绑定模态框，返回是否已绑定 */
  async function ensureBound(): Promise<boolean> {
    const bound = await checkBound();
    if (!bound) {
      bindModalVisible.value = true;
    }
    return bound;
  }

  /** 打开绑定模态框 */
  function openBindModal() {
    bindModalVisible.value = true;
  }

  /** 关闭绑定模态框 */
  function closeBindModal() {
    bindModalVisible.value = false;
  }

  return {
    isBound,
    checking,
    bindModalVisible,
    checkBound,
    ensureBound,
    openBindModal,
    closeBindModal
  };
}
