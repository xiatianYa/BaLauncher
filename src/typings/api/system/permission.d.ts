/**
 * namespace System
 *
 * backend api module: "System"
 */
declare namespace Api {
  namespace System {
    /** permission page list */
    type SysPermissionPageList = Common.PaginatingQueryRecord<SysPermissionVo>;

    /** permission vo (按钮权限) */
    type SysPermissionVo = Common.CommonRecord<{
      /** 权限资源 */
      code: string;
      /** 描述 */
      description: string;
    }>;

    /** permission search dto (按钮权限 查询参数) */
    type SysPermissionSearchDTO = CommonType.RecordNullable<{
      /** 权限资源 */
      code?: string;
      /** 描述 */
      description?: string;
    } & Api.Common.CommonSearchParams>;

    /** permission form dto (新增 / 修改) */
    type SysPermissionFormDTO = CommonType.RecordNullable<{
      /** 权限ID(修改时必填) */
      id?: string;
      /** 权限资源 */
      code: string;
      /** 描述 */
      description?: string;
    }>;
  }
}
