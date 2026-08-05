import { request } from '@/service/request';

/** 生成当前登录用户的绑定令牌（在QQ群内发送「用户绑定 令牌」完成绑定） */
export function fetchGetBindToken() {
  return request<string>({
    url: '/sysUser/getBindToken',
    method: 'get'
  });
}

/** 分页查询用户 */
export function fetchGetUserPageList(params?: Api.System.SysUserSearchDTO) {
  return request<Api.System.SysUserPageList>({
    url: '/sysUser/page',
    method: 'get',
    params
  });
}

/** 新增用户 */
export function fetchSaveUser(params: Api.System.SysUserFormDTO) {
  return request({
    url: '/sysUser/save',
    method: 'post',
    data: params
  });
}

/** 修改用户 */
export function fetchUpdateUser(params: Api.System.SysUserFormDTO) {
  return request({
    url: '/sysUser/update',
    method: 'put',
    data: params
  });
}

/** 删除用户 */
export function fetchDeleteUser(id: string) {
  return request({
    url: `/sysUser/remove/${id}`,
    method: 'delete'
  });
}