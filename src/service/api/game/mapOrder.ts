import { request } from '@/service/request';

/** 分页查询地图订阅 */
export function fetchGetGameMapOrderPage(
  params: Api.Game.GameMapOrderSearchDTO & Api.Common.CommonSearchParams
) {
  return request<Api.Game.GameMapOrderPageList>({
    url: '/gameMapOrder/page',
    method: 'get',
    params
  });
}

/** 删除地图订阅（按订阅ID） */
export function fetchRemoveGameMapOrder(id: string) {
  return request({
    url: `/gameMapOrder/removeByGroup/${id}`,
    method: 'delete'
  });
}
