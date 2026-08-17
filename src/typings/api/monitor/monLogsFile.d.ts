/**
 * namespace Monitor
 *
 * backend api module: "monitor"（日志管理） - 文件上传日志
 */
declare namespace Api {
  namespace Monitor {
    /** 文件上传日志 VO */
    type MonLogsFileVo = Common.CommonRecord<{
      /** 用户ID */
      userId?: number;
      /** 用户名称 */
      userName?: string;
      /** 文件路径 */
      fileUrl?: string;
      /** 文件大小 */
      fileSize?: string;
      /** 上传状态(0:失败 1:成功) */
      status?: string;
    }>;

    /** 文件上传日志分页结果 */
    type MonLogsFilePageList = Common.PaginatingQueryRecord<MonLogsFileVo>;

    /** 文件上传日志查询参数（后端 DTO 的 userName 实为用户ID） */
    type MonLogsFileSearchParams = CommonType.RecordNullable<{
      /** 用户ID */
      userName?: number;
    } & Api.Common.CommonSearchParams>;
  }
}
