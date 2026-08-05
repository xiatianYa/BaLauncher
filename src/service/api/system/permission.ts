import { request } from '@/service/request';

/** 查询全部按钮权限 */
export function fetchGetPermissionList() {
  return request<Api.System.SysPermissionVo[]>({
    url: '/sysPermission/list',
    method: 'get'
  });
}
