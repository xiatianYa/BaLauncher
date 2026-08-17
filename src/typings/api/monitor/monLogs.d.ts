/**
 * namespace Monitor
 *
 * backend api module: "monitor"（日志管理）
 */
declare namespace Api {
  namespace Monitor {
    /** 操作日志 VO */
    type MonLogsOperationVo = Common.CommonRecord<{
      /** 请求ID */
      requestId?: string;
      /** IP */
      ip?: string;
      /** IP所属地 */
      ipAddr?: string;
      /** 登录代理 */
      userAgent?: string;
      /** 请求URI */
      requestUri?: string;
      /** 请求方式 */
      requestMethod?: string;
      /** 请求内容类型 */
      contentType?: string;
      /** 接口说明 */
      operation?: string;
      /** 方法名称 */
      methodName?: string;
      /** 请求参数 */
      methodParams?: string;
      /** 请求耗时（毫秒） */
      useTime?: number;
      /** 操作用户ID */
      createUserId?: number;
      /** 操作用户名称 */
      createUser?: string;
    }>;

    /** 登录日志 VO */
    type MonLogsLoginVo = Common.CommonRecord<{
      /** 用户ID */
      userId?: number;
      /** 用户名称 */
      userName?: string;
      /** IP */
      ip?: string;
      /** IP所属地 */
      ipAddr?: string;
      /** 登录代理 */
      userAgent?: string;
      /** 登录状态(0:失败 1:成功) */
      status?: string;
      /** 登录错误日志 */
      message?: string;
    }>;

    /** 异常日志 VO */
    type MonLogsErrorVo = Common.CommonRecord<{
      /** 请求ID */
      requestId?: string;
      /** IP */
      ip?: string;
      /** IP所属地 */
      ipAddr?: string;
      /** 登录代理 */
      userAgent?: string;
      /** 请求URI */
      requestUri?: string;
      /** 请求方式 */
      requestMethod?: string;
      /** 请求内容类型 */
      contentType?: string;
      /** 接口说明 */
      operation?: string;
      /** 方法名称 */
      methodName?: string;
      /** 请求参数 */
      methodParams?: string;
      /** 请求耗时（毫秒） */
      useTime?: number;
      /** 异常信息 */
      exceptionMessage?: string;
      /** 异常类 */
      exceptionClass?: string;
      /** 异常行号 */
      line?: number;
      /** 堆栈信息 */
      stackTrace?: string;
      /** 操作用户ID */
      createUserId?: number;
      /** 操作用户名称 */
      createUser?: string;
    }>;

    /** 操作日志分页结果 */
    type MonLogsOperationPageList = Common.PaginatingQueryRecord<MonLogsOperationVo>;
    /** 登录日志分页结果 */
    type MonLogsLoginPageList = Common.PaginatingQueryRecord<MonLogsLoginVo>;
    /** 异常日志分页结果 */
    type MonLogsErrorPageList = Common.PaginatingQueryRecord<MonLogsErrorVo>;

    /** 操作日志查询参数 */
    type MonLogsOperationSearchParams = CommonType.RecordNullable<{
      /** 操作用户ID */
      createUser?: number;
    } & Api.Common.CommonSearchParams>;

    /** 登录日志查询参数 */
    type MonLogsLoginSearchParams = CommonType.RecordNullable<{
      /** 用户名称 */
      userName?: string;
    } & Api.Common.CommonSearchParams>;

    /** 异常日志查询参数（后端复用操作日志查询 DTO） */
    type MonLogsErrorSearchParams = MonLogsOperationSearchParams;
  }
}
