import { request } from '@/service/request';

// 获取社区列表(分页)
export function fetchGetCommunityPage(params?: Api.Game.CommunitySearchParams) {
  return request<Api.Game.CommunityList>({
    url: '/gameCommunity/page',
    method: 'get',
    params
  });
}

// 获取社区列表(列表)
export function fetchGetCommunityList() {
  return request<Api.Game.CommunityList>({
    url: '/gameCommunity/list',
    method: 'get',
  });
}

/** 删除社区 */
export function fetchDeleteCommunityById(id: number) {
  return request({
    url: `/gameCommunity/remove/${id}`,
    method: 'delete'
  });
}

/** 修改社区 */
export function fetchUpdateCommunity(params: Api.Game.CommunityParams) {
  return request({
    url: `/gameCommunity/update`,
    method: 'put',
    data: params
  });
}

/** 新增社区 */
export function fetchInsertCommunity(params: Api.Game.CommunityParams) {
  return request({
    url: `/gameCommunity/save`,
    method: 'post',
    data: params
  });
}

/** 获取全部社区名称 */
export function fetchGetCommunityNames() {
  return request<CommonType.Option<string>[]>({
    url: '/gameCommunity/allCommunityNames',
    method: 'get'
  });
}
