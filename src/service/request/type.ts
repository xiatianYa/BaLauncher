/** 后端统一响应格式 */
export type Response<T = unknown> = {
  /** 响应状态码（如 "0000" 表示成功） */
  code: string;
  /** 响应提示信息 */
  msg: string;
  /** 响应业务数据 */
  data: T;
};