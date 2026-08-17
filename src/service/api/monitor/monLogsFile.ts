import { request } from '@/service/request';

// =============== File Log Begin ===============

/** get file log page list */
export function fetchGetMonLogsFilePageList(params?: Api.Monitor.MonLogsFileSearchParams) {
  return request<Api.Monitor.MonLogsFilePageList>({
    url: '/monLogsFile/page',
    method: 'get',
    params
  });
}

/** get file log info */
export function fetchGetMonLogsFileInfo(id: number) {
  return request<Api.Monitor.MonLogsFileVo>({
    url: `/monLogsFile/getInfo/${id}`,
    method: 'get'
  });
}

/** remove file log */
export function fetchRemoveMonLogsFile(id: number) {
  return request<boolean>({
    url: `/monLogsFile/remove/${id}`,
    method: 'delete'
  });
}

/** clear all file logs */
export function fetchClearMonLogsFile() {
  return request<boolean>({
    url: '/monLogsFile/clearAll',
    method: 'delete'
  });
}
