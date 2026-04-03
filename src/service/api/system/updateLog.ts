import { request } from '@/service/request';

// =============== Update Log Begin ===============

/** save update log */
export function fetchSaveUpdateLog(data: Api.System.SysUpdateLogAddDTO) {
  return request<boolean>({
    url: '/sysUpdateLog/save',
    method: 'post',
    data
  });
}

/** remove update log */
export function fetchRemoveUpdateLog(id: number) {
  return request<boolean>({
    url: `/sysUpdateLog/remove/${id}`,
    method: 'delete'
  });
}

/** update update log */
export function fetchUpdateUpdateLog(data: Api.System.SysUpdateLogUpdateDTO) {
  return request<boolean>({
    url: '/sysUpdateLog/update',
    method: 'put',
    data
  });
}

/** get update log list */
export function fetchGetUpdateLogList() {
  return request<Api.System.UpdateLogVo[]>({
    url: '/sysUpdateLog/list',
    method: 'get'
  });
}

/** get update log info */
export function fetchGetUpdateLogInfo(id: number) {
  return request<Api.System.UpdateLogVo>({
    url: `/sysUpdateLog/getInfo/${id}`,
    method: 'get'
  });
}

/** get update log page list */
export function fetchGetUpdateLogPageList(params?: Api.System.SysUpdateLogSearchDTO) {
  return request<Api.System.UpdateLogPageList>({
    url: '/sysUpdateLog/page',
    method: 'get',
    params
  });
}

/** get latest update log list */
export function fetchGetLatestUpdateLogList(limit?: number) {
  return request<Api.System.UpdateLogVo[]>({
    url: '/sysUpdateLog/listLatest',
    method: 'get',
    params: limit ? { limit } : undefined
  });
}
