import { request } from '@/service/request';

// 获取游戏服务器列表(分页)
export function fetchGetServerPage(params?: Api.Game.ServerSearchParams) {
  return request<Api.Game.ServerList>({
    url: '/gameServer/page',
    method: 'get',
    params
  });
}

// 获取游戏服务器列表(列表)
export function fetchGetServerList() {
  return request<Api.Game.ServerList>({
    url: '/gameServer/list',
    method: 'get',
  });
}

/** 删除游戏服务器 */
export function fetchDeleteServerById(id: number) {
  return request({
    url: `/gameServer/remove/${id}`,
    method: 'delete'
  });
}

/** 修改游戏服务器 */
export function fetchUpdateServer(params: Api.Game.ServerParams) {
  return request({
    url: `/gameServer/update`,
    method: 'put',
    data: params
  });
}

/** 新增游戏服务器 */
export function fetchInsertServer(params: Api.Game.ServerParams) {
  return request({
    url: `/gameServer/save`,
    method: 'post',
    data: params
  });
}
