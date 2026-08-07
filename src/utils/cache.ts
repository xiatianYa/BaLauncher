import { localStg } from '@/utils/storage';
import {
  GAME_STORAGE_KEYS,
  APP_STORAGE_KEYS,
  AUTH_STORAGE_KEYS,
  ROUTE_STORAGE_KEYS
} from '@/constants/cache';

/** 可清除的本地缓存分类 */
export type CacheScope = 'game' | 'app' | 'auth' | 'route' | 'image';

/** 分类 -> localStorage 存储键集合（image 为磁盘图片缓存，通过 IPC 清理） */
export const SCOPE_STORAGE_KEYS: Record<Exclude<CacheScope, 'image'>, Record<string, string>> = {
  game: GAME_STORAGE_KEYS,
  app: APP_STORAGE_KEYS,
  auth: AUTH_STORAGE_KEYS,
  route: ROUTE_STORAGE_KEYS
};

/**
 * 全局统一缓存清理函数
 *
 * 使用场景：
 * - 退出登录：clearLocalCache(['game', 'app', 'auth', 'route'])，保留地图资源（图片磁盘缓存）
 * - 更新安装前：clearLocalCache(['game', 'app', 'route'])，保留登录态与地图资源
 * - 设置页手动清理：按所选缓存类型映射为对应 scope
 */
export async function clearLocalCache(scopes: CacheScope[]): Promise<void> {
  // 清除 localStorage 数据
  scopes.forEach((scope) => {
    if (scope === 'image') return;
    Object.values(SCOPE_STORAGE_KEYS[scope]).forEach((key) =>
      localStg.remove(key as keyof StorageType.Local)
    );
  });

  // 清除磁盘图片缓存（含地图缩略图等远程图片）
  if (scopes.includes('image')) {
    await window.ipcRenderer.clearImageCache();
  }
}

/** 格式化字节大小（B/KB/MB） */
export function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size}B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)}KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(2)}MB`;
}

/** 计算单个分类在 localStorage 中的占用字节数（按 UTF-16 双字节近似估算） */
export function getScopeStorageSize(scope: Exclude<CacheScope, 'image'>): number {
  let size = 0;
  Object.values(SCOPE_STORAGE_KEYS[scope]).forEach((key) => {
    const value = localStg.get(key as keyof StorageType.Local);
    if (value !== null && value !== undefined) {
      size += (key.length + JSON.stringify(value).length) * 2;
    }
  });
  return size;
}

/** 计算全部 localStorage 占用字节数 */
export function getLocalStorageSize(): number {
  return (Object.keys(SCOPE_STORAGE_KEYS) as Exclude<CacheScope, 'image'>[]).reduce(
    (sum, scope) => sum + getScopeStorageSize(scope),
    0
  );
}
