import { request } from '@/service/request';

/** 分页查询机器人群 */
export function fetchGetBotGroupPageList(params?: Api.Bot.BotGroupSearchDTO) {
  return request<Api.Bot.BotGroupPageList>({
    url: '/botGroup/page',
    method: 'get',
    params
  });
}

/** 新增机器人群 */
export function fetchInsertBotGroup(params: Api.Bot.BotGroupEdit) {
  return request({
    url: '/botGroup/save',
    method: 'post',
    data: params
  });
}

/** 修改机器人群 */
export function fetchUpdateBotGroup(params: Api.Bot.BotGroupEdit) {
  return request({
    url: '/botGroup/updateByGroup',
    method: 'put',
    data: params
  });
}

/** 删除机器人群 */
export function fetchRemoveBotGroup(id: string) {
  return request({
    url: `/botGroup/remove/${id}`,
    method: 'delete'
  });
}
