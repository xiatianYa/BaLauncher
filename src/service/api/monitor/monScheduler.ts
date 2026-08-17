import { request } from '@/service/request';

/** get scheduler page list */
export function fetchGetMonSchedulerPageList(params?: Api.Monitor.MonSchedulerSearchParams) {
  return request<Api.Monitor.MonSchedulerPageList>({
    url: '/monScheduler/page',
    method: 'get',
    params
  });
}

/** get scheduler info */
export function fetchGetMonSchedulerInfo(id: number) {
  return request<Api.Monitor.MonSchedulerVo>({
    url: `/monScheduler/getInfo/${id}`,
    method: 'get'
  });
}

/** get all schedulers */
export function fetchGetMonSchedulerList() {
  return request<Api.Monitor.MonSchedulerVo[]>({
    url: '/monScheduler/list',
    method: 'get'
  });
}

/** add scheduler */
export function fetchSaveMonScheduler(data: Api.Monitor.MonSchedulerEditParams) {
  return request<boolean>({
    url: '/monScheduler/save',
    method: 'post',
    data
  });
}

/** update scheduler */
export function fetchUpdateMonScheduler(data: Api.Monitor.MonSchedulerEditParams) {
  return request<boolean>({
    url: '/monScheduler/update',
    method: 'put',
    data
  });
}

/** remove scheduler */
export function fetchRemoveMonScheduler(id: number) {
  return request<boolean>({
    url: `/monScheduler/remove/${id}`,
    method: 'delete'
  });
}

/** remove schedulers in batch */
export function fetchRemoveMonSchedulers(ids: number[]) {
  return request<boolean>({
    url: '/monScheduler/removeByIds',
    method: 'delete',
    data: ids
  });
}

/** get all scheduler job names */
export function fetchGetMonSchedulerAllJobNames() {
  return request<Api.Monitor.MonSchedulerNameOptions[]>({
    url: '/monScheduler/allJobNames',
    method: 'get'
  });
}

/** run scheduler once */
export function fetchRunMonSchedulerOnce(id: number) {
  return request<void>({
    url: `/monScheduler/runOnce/${id}`,
    method: 'post'
  });
}

/** pause scheduler */
export function fetchPauseMonScheduler(id: number) {
  return request<void>({
    url: `/monScheduler/pause/${id}`,
    method: 'post'
  });
}

/** resume scheduler */
export function fetchResumeMonScheduler(id: number) {
  return request<void>({
    url: `/monScheduler/resume/${id}`,
    method: 'post'
  });
}

/** change scheduler status (1=start, 0=stop) */
export function fetchChangeMonSchedulerStatus(id: number, status: number) {
  return request<void>({
    url: `/monScheduler/changeStatus/${id}/${status}`,
    method: 'post'
  });
}
