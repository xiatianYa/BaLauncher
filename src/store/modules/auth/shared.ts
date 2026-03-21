import { localStg } from "@/utils/storage";
import { AUTH_STORAGE_KEYS } from '@/constants/cache';

/** Get token */
export function getToken() {
  return localStg.get(AUTH_STORAGE_KEYS.TOKEN) || '';
}

/** Clear auth storage */
export function clearAuthStorage() {
  localStg.remove(AUTH_STORAGE_KEYS.TOKEN);
  localStg.remove(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
}
