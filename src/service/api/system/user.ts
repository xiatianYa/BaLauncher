import { request } from '@/service/request';

/** 绑定用户QQ号 */
export function fetchBindQQ(qq: string | null) {
  return request<boolean>({
    url: `/sysUser/bindQQ/${qq}`,
    method: 'put'
  });
}

/** 绑定用户QQ群号 */
export function fetchBindQQGroup(group: string | null) {
  return request<boolean>({
    url: `/sysUser/bindQqGroup/${group}`,
    method: 'put'
  });
}