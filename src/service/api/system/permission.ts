import { request } from '@/service/request';

/** 查询全部按钮权限 */
export function fetchGetPermissionList() {
  return request<Api.System.SysPermissionVo[]>({
    url: '/sysPermission/list',
    method: 'get'
  });
}

/** 分页查询按钮权限 */
export function fetchGetPermissionPageList(params?: Api.System.SysPermissionSearchDTO) {
  return request<Api.System.SysPermissionPageList>({
    url: '/sysPermission/page',
    method: 'get',
    params
  });
}

/** 新增按钮权限 */
export function fetchSavePermission(params: Api.System.SysPermissionFormDTO) {
  return request({
    url: '/sysPermission/save',
    method: 'post',
    data: params
  });
}

/** 修改按钮权限 */
export function fetchUpdatePermission(params: Api.System.SysPermissionFormDTO) {
  return request({
    url: '/sysPermission/update',
    method: 'put',
    data: params
  });
}

/** 删除按钮权限 */
export function fetchDeletePermission(id: string) {
  return request({
    url: `/sysPermission/remove/${id}`,
    method: 'delete'
  });
}
