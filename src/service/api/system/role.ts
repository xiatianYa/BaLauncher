import { request } from '@/service/request';

// =============== Role Begin ===============

/** get role page list */
export function fetchGetRolePageList(params?: Api.System.SysRoleSearchDTO) {
  return request<Api.System.SysRolePageList>({
    url: '/sysRole/page',
    method: 'get',
    params
  });
}

/** 新增角色 */
export function fetchSaveRole(params: Api.System.SysRoleFormDTO) {
  return request({
    url: '/sysRole/save',
    method: 'post',
    data: params
  });
}

/** 修改角色 */
export function fetchUpdateRole(params: Api.System.SysRoleFormDTO) {
  return request({
    url: '/sysRole/update',
    method: 'put',
    data: params
  });
}

/** 删除角色 */
export function fetchDeleteRole(id: string) {
  return request({
    url: `/sysRole/remove/${id}`,
    method: 'delete'
  });
}

/** 查询角色拥有的按钮权限(权限ID列表) */
export function fetchGetRolePermissions(roleId: string) {
  return request<number[]>({
    url: `/sysRolePermission/getPermissionByRoleId/${roleId}`,
    method: 'get'
  });
}
