import { request } from '@/service/request';

// =============== Operation Log Begin ===============

/** get operation log page list */
export function fetchGetMonLogsOperationPageList(params?: Api.Monitor.MonLogsOperationSearchParams) {
  return request<Api.Monitor.MonLogsOperationPageList>({
    url: '/monLogsOperation/page',
    method: 'get',
    params
  });
}

/** get operation log info */
export function fetchGetMonLogsOperationInfo(id: number) {
  return request<Api.Monitor.MonLogsOperationVo>({
    url: `/monLogsOperation/getInfo/${id}`,
    method: 'get'
  });
}

/** remove operation log */
export function fetchRemoveMonLogsOperation(id: number) {
  return request<boolean>({
    url: `/monLogsOperation/remove/${id}`,
    method: 'delete'
  });
}

/** clear all operation logs */
export function fetchClearMonLogsOperation() {
  return request<boolean>({
    url: '/monLogsOperation/clearAll',
    method: 'delete'
  });
}

// =============== Login Log Begin ===============

/** get login log page list */
export function fetchGetMonLogsLoginPageList(params?: Api.Monitor.MonLogsLoginSearchParams) {
  return request<Api.Monitor.MonLogsLoginPageList>({
    url: '/monLogsLogin/page',
    method: 'get',
    params
  });
}

/** get login log info */
export function fetchGetMonLogsLoginInfo(id: number) {
  return request<Api.Monitor.MonLogsLoginVo>({
    url: `/monLogsLogin/getInfo/${id}`,
    method: 'get'
  });
}

/** remove login log */
export function fetchRemoveMonLogsLogin(id: number) {
  return request<boolean>({
    url: `/monLogsLogin/remove/${id}`,
    method: 'delete'
  });
}

/** clear all login logs */
export function fetchClearMonLogsLogin() {
  return request<boolean>({
    url: '/monLogsLogin/clearAll',
    method: 'delete'
  });
}

// =============== Error Log Begin ===============

/** get error log page list */
export function fetchGetMonLogsErrorPageList(params?: Api.Monitor.MonLogsErrorSearchParams) {
  return request<Api.Monitor.MonLogsErrorPageList>({
    url: '/monLogsError/page',
    method: 'get',
    params
  });
}

/** get error log info */
export function fetchGetMonLogsErrorInfo(id: number) {
  return request<Api.Monitor.MonLogsErrorVo>({
    url: `/monLogsError/getInfo/${id}`,
    method: 'get'
  });
}

/** remove error log */
export function fetchRemoveMonLogsError(id: number) {
  return request<boolean>({
    url: `/monLogsError/remove/${id}`,
    method: 'delete'
  });
}

/** clear all error logs */
export function fetchClearMonLogsError() {
  return request<boolean>({
    url: '/monLogsError/clearAll',
    method: 'delete'
  });
}
