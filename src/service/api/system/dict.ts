import { request } from '@/service/request';

// =============== Dict Begin ===============

/** get dict page list */
export function fetchGetDictPageList(params?: Api.System.DictSearchParams) {
  return request<Api.System.DictPageList>({
    url: '/sysDict/page',
    method: 'get',
    params
  });
}

/** get dict list */
export function fetchGetDictList() {
  return request<Api.System.DictTree[]>({
    url: '/sysDict/list',
    method: 'get'
  });
}

/** get all dict options list */
export function fetchGetAllDictOptionsList() {
  return request<CommonType.Option[]>({
    url: '/sysDict/allOptions',
    method: 'get'
  });
}

/** get dict edit */
export function fetchGetEditDict(id: number) {
  return request<Api.System.Dict>({
    url: `/sysDict/getInfo/${id}`,
    method: 'get'
  });
}

/** add dict info */
export function fetchAddDict(data: Api.System.DictEdit) {
  return request<boolean>({
    url: '/sysDict/save',
    method: 'post',
    data
  });
}

/** update dict info */
export function fetchUpdateDict(data: Api.System.DictEdit) {
  return request<boolean>({
    url: '/sysDict/update',
    method: 'put',
    data
  });
}

/** edit delete dict */
export function fetchDeleteDict(data: { ids: number[] }) {
  return request<boolean>({
    url: '/sysDict',
    method: 'delete',
    data
  });
}

/** get all item dict Map */
export function fetchGetAllDictItemMap() {
  return request<Map<string, Api.System.DictOptions[]>>({
    url: '/sysDict/allDict',
    method: 'get'
  });
}

/** get dict item page list */
export function fetchGetDictItemPageList(params?: Api.System.DictItemSearchParams) {
  return request<Api.System.DictItemPageList>({
    url: '/sysDictItem/page',
    method: 'get',
    params
  });
}

/** get dict item edit */
export function fetchGetEditDictItem(id: number) {
  return request<Api.System.DictItem>({
    url: `/sysDictItem/getInfo/${id}`,
    method: 'get'
  });
}

/** add dict item info */
export function fetchAddDictItem(data: Api.System.DictItemEdit) {
  return request<boolean>({
    url: '/sysDictItem/save',
    method: 'post',
    data
  });
}

/** update dict item info */
export function fetchUpdateDictItem(data: Api.System.DictItemEdit) {
  return request<boolean>({
    url: '/sysDictItem/update',
    method: 'put',
    data
  });
}

/** edit delete item dict */
export function fetchDeleteDictItem(data: { ids: number[] }) {
  return request<boolean>({
    url: '/sysDictItem',
    method: 'delete',
    data
  });
}

/** get item dict Map */
export function fetchGetDictItemMap(data: Api.System.DictStoreSearchParams) {
  return request<Api.System.DictOptions[]>({
    url: '/sysDictItem/mapOptions',
    method: 'get',
    data
  });
}
