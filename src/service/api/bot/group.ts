import { request } from '@/service/request';

/** 分页查询机器人群 */
export function fetchGetBotGroupPageList(params?: Api.Bot.BotGroupSearchDTO) {
  return request<Api.Bot.BotGroupPageList>({
    url: '/botGroup/page',
    method: 'get',
    params
  });
}
