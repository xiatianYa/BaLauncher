import { request } from '@/service/request';

// =============== Update Log Begin ===============

/** save update log */
export function fetchSaveLog(data: Api.System.SysUpdateLogAddDTO) {
  return request<boolean>({
    url: '/sysUpdateLog/save',
    method: 'post',
    data
  });
}

/** remove update log */
export function fetchRemoveLog(id: number) {
  return request<boolean>({
    url: `/sysUpdateLog/remove/${id}`,
    method: 'delete'
  });
}

/** update update log */
export function fetchUpdateLog(data: Api.System.SysUpdateLogUpdateDTO) {
  return request<boolean>({
    url: '/sysUpdateLog/update',
    method: 'put',
    data
  });
}

/** get update log list */
export function fetchGetLogList() {
  return request<Api.System.UpdateLogVo[]>({
    url: '/sysUpdateLog/list',
    method: 'get'
  });
}

/** get update log info */
export function fetchGetLogInfo(id: number) {
  return request<Api.System.UpdateLogVo>({
    url: `/sysUpdateLog/getInfo/${id}`,
    method: 'get'
  });
}

/** get update log page list */
export function fetchGetLogPageList(params?: Api.System.SysUpdateLogSearchDTO) {
  return request<Api.System.UpdateLogPageList>({
    url: '/sysUpdateLog/page',
    method: 'get',
    params
  });
}

/** get latest update log list */
export function fetchGetLatestLogList(limit?: number) {
  return request<Api.System.UpdateLogVo[]>({
    url: '/sysUpdateLog/listLatest',
    method: 'get',
    params: limit ? { limit } : undefined
  });
}

/** get update log by version */
export function fetchGetLogByVersion(version: string) {
  return request<Api.System.UpdateLogVo>({
    url: `/sysUpdateLog/getByVersion/${version}`,
    method: 'get'
  });
}
