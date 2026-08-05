/**
 * namespace System
 *
 * backend api module: "System"
 */
declare namespace Api {
  namespace System {
    /** permission vo (按钮权限) */
    type SysPermissionVo = Common.CommonRecord<{
      /** 权限资源 */
      code: string;
      /** 描述 */
      description: string;
    }>;
  }
}
