import { request } from '@/service/request';

/** 获取按键配置分页列表 */
export function fetchGetKeyBindPage(params?: Api.Game.KeyBindSearchParams) {
  return request<Api.Game.KeyBindPageResult>({
    url: '/gameKeyBind/page',
    method: 'get',
    params
  });
}

/** 获取按键配置列表 */
export function fetchGetKeyBindList(params?: Api.Game.KeyBindSearchParams) {
  return request<Api.Game.KeyBindList>({
    url: '/gameKeyBind/list',
    method: 'get',
    params
  });
}

/** 根据ID获取按键配置详情 */
export function fetchGetKeyBindById(id: number) {
  return request<Api.Game.KeyBindVO>({
    url: `/gameKeyBind/detail/${id}`,
    method: 'get'
  });
}

/** 新增按键配置 */
export function fetchAddKeyBind(params: Api.Game.KeyBindAddParams) {
  return request({
    url: '/gameKeyBind/save',
    method: 'post',
    data: params
  });
}

/** 更新按键配置 */
export function fetchUpdateKeyBind(params: Api.Game.KeyBindUpdateParams) {
  return request({
    url: '/gameKeyBind/update',
    method: 'put',
    data: params
  });
}

/** 删除按键配置 */
export function fetchDeleteKeyBind(id: number) {
  return request({
    url: `/gameKeyBind/remove/${id}`,
    method: 'delete'
  });
}

/** 获取当前登录用户的按键绑定配置列表 */
export function fetchGetMyKeyBinds() {
  return request<Api.Game.KeyBindList>({
    url: '/gameKeyBind/listMy',
    method: 'get'
  });
}

/** 获取所有已分享的按键绑定配置列表 */
export function fetchGetAllSharedKeyBinds() {
  return request<Api.Game.KeyBindList>({
    url: '/gameKeyBind/listAllShared',
    method: 'get'
  });
}

/** 增加按键绑定配置使用次数 */
export function fetchIncrementUseCount(id: number) {
  return request<boolean>({
    url: `/gameKeyBind/incrementUseCount/${id}`,
    method: 'post'
  });
}
