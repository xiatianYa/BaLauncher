import { request } from '@/service/request';

/** 分页查询机器人群成员 */
export function fetchGetBotGroupMemberPageList(
  params?: Api.Bot.BotGroupMemberSearchDTO & Api.Common.CommonSearchParams
) {
  return request<Api.Bot.BotGroupMemberPageList>({
    url: '/botGroupMember/page',
    method: 'get',
    params
  });
}

/** 查询当前登录用户是否已绑定群成员 */
export function fetchBotGroupMemberIsBound() {
  return request<boolean>({
    url: '/botGroupMember/isBound',
    method: 'get'
  });
}
