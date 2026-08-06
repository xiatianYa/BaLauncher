import { request } from '@/service/request';

// =============== Sys Notice Begin ===============

/** 新增系统通知 */
export function fetchSaveNotice(data: Api.System.SysNoticeAddDTO) {
  return request<boolean>({
    url: '/sysNotice/save',
    method: 'post',
    data
  });
}

/** 删除系统通知 */
export function fetchRemoveNotice(id: number | string) {
  return request<boolean>({
    url: `/sysNotice/remove/${id}`,
    method: 'delete'
  });
}

/** 修改系统通知 */
export function fetchUpdateNotice(data: Api.System.SysNoticeUpdateDTO) {
  return request<boolean>({
    url: '/sysNotice/update',
    method: 'put',
    data
  });
}

/** 查询所有系统通知 */
export function fetchGetNoticeList() {
  return request<Api.System.SysNoticeVo[]>({
    url: '/sysNotice/list',
    method: 'get'
  });
}

/** 获取系统通知详情 */
export function fetchGetNoticeInfo(id: number | string) {
  return request<Api.System.SysNoticeVo>({
    url: `/sysNotice/getInfo/${id}`,
    method: 'get'
  });
}

/** 分页查询系统通知 */
export function fetchGetNoticePageList(params?: Api.System.SysNoticeSearchDTO) {
  return request<Api.System.NoticePageList>({
    url: '/sysNotice/page',
    method: 'get',
    params
  });
}

/** 获取当前用户的通知列表 */
export function fetchGetMyNoticeList() {
  return request<Api.System.SysNoticeVo[]>({
    url: '/sysNotice/listMy',
    method: 'get'
  });
}

/** 标记通知为已读 */
export function fetchMarkNoticeAsRead(id: number | string) {
  return request<boolean>({
    url: `/sysNotice/markAsRead/${id}`,
    method: 'post'
  });
}

/** 标记所有通知为已读 */
export function fetchMarkAllNoticesAsRead() {
  return request<boolean>({
    url: '/sysNotice/markAllAsRead',
    method: 'post'
  });
}

/** 获取未读通知数量 */
export function fetchGetNoticeUnreadCount() {
  return request<number>({
    url: '/sysNotice/unreadCount',
    method: 'get'
  });
}
