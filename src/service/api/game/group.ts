import { request } from '@/service/request';

/** 获取全部群号 */
export function fetchGetGroupList() {
  return request<CommonType.Option<string>[]>({
    url: '/botGroup/listGroupIds',
    method: 'get'
  });
}
