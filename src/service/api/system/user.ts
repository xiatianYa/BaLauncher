import { request } from '@/service/request';

/** 生成当前登录用户的绑定令牌（在QQ群内发送「用户绑定 令牌」完成绑定） */
export function fetchGetBindToken() {
  return request<string>({
    url: '/sysUser/getBindToken',
    method: 'get'
  });
}