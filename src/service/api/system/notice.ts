import { request } from '@/service/request';

// =============== Notice Begin ===============

/** save notice */
export function fetchSaveNotice(data: Api.System.SysNoticeAddDTO) {
  return request<boolean>({
    url: '/sysNotice/save',
    method: 'post',
    data
  });
}

/** remove notice */
export function fetchRemoveNotice(id: number) {
  return request<boolean>({
    url: `/sysNotice/remove/${id}`,
    method: 'delete'
  });
}

/** update notice */
export function fetchUpdateNotice(data: Api.System.SysNoticeUpdateDTO) {
  return request<boolean>({
    url: '/sysNotice/update',
    method: 'put',
    data
  });
}

/** get notice list */
export function fetchGetNoticeList() {
  return request<Api.System.NoticeVo[]>({
    url: '/sysNotice/list',
    method: 'get'
  });
}

/** get notice info */
export function fetchGetNoticeInfo(id: number) {
  return request<Api.System.NoticeVo>({
    url: `/sysNotice/getInfo/${id}`,
    method: 'get'
  });
}

/** get notice page list */
export function fetchGetNoticePageList(params?: Api.System.SysNoticeSearchDTO) {
  return request<Api.System.NoticePageList>({
    url: '/sysNotice/page',
    method: 'get',
    params
  });
}

/** get current user's notice list */
export function fetchGetMyNoticeList() {
  return request<Api.System.NoticeVo[]>({
    url: '/sysNotice/listMy',
    method: 'get'
  });
}

/** mark notice as read */
export function fetchMarkAsRead(id: number) {
  return request<boolean>({
    url: `/sysNotice/markAsRead/${id}`,
    method: 'post'
  });
}

/** mark all notices as read */
export function fetchMarkAllAsRead() {
  return request<boolean>({
    url: '/sysNotice/markAllAsRead',
    method: 'post'
  });
}

/** get unread notice count */
export function fetchGetUnreadCount() {
  return request<number>({
    url: '/sysNotice/unreadCount',
    method: 'get'
  });
}
