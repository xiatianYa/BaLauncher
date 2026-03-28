import { request } from '@/service/request';

// 获取游戏地图列表(分页)
export function fetchGetMapPage(params?: Api.Common.CommonSearchParams, content?: string) {
  return request<Api.Game.MapList>({
    url: '/gameMap/page',
    method: 'get',
    params: {
      ...params,
      content: content || ''
    }
  });
}

// 获取游戏地图详情
export function fetchGetMapList() {
  return request<Api.Game.Map[]>({
    url: `/gameMap/list`,
    method: 'get'
  });
}

/** 删除游戏地图 */
export function fetchDeleteMapById(id: number) {
  return request({
    url: `/gameMap/remove/${id}`,
    method: 'delete'
  });
}

/** 修改游戏地图 */
export function fetchUpdateMap(params: Api.Game.MapParams) {
  return request({
    url: `/gameMap/update`,
    method: 'put',
    data: params
  });
}

/** 新增游戏地图 */
export function fetchInsertMap(params: Api.Game.MapParams) {
  return request({
    url: `/gameMap/save`,
    method: 'post',
    data: params
  });
}

/** 获取全部地图名称 */
export function fetchGetMapNames() {
  return request<CommonType.Option<string>[]>({
    url: '/gameMap/allMapNames',
    method: 'get'
  });
}

/**
 * 获取用户订阅列表
 */
export function fetchGetUserSubscribeList() {
  return request<Api.Game.MapVo[]>({
    url: '/gameMapOrder/listMy',
    method: 'get'
  });
}

/**
 * 添加地图订阅
 */
export function fetchAddMapSubscribe(mapId: number, systemOrder?: string | null, qqOrder?: string | null) {
  return request({
    url: `/gameMapOrder/save`,
    method: 'post',
    data: { mapId, systemOrder, qqOrder }
  });
}

/**
 * 删除地图订阅
 */
export function fetchDeleteMapSubscribe(mapId: number) {
  return request({
    url: `/gameMapOrder/removeByMapId/${mapId}`,
    method: 'delete'
  });
}
