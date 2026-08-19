import { request } from '@/service/request';

/**
 * 根据 Steam 创意工坊 ID 列表查询工坊信息及作者信息（JSON 数组方式传入多个 ID）
 * @param workshopIds Steam 创意工坊 ID 列表
 */
export function fetchSteamWorkshopInfo(workshopIds: string[]) {
  return request<Api.Workshop.SteamWorkshopInfoVo[]>({
    url: '/workshop/steamWorkshopInfo',
    method: 'post',
    data: workshopIds
  });
}
