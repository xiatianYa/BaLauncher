/**
 * namespace System
 *
 * backend api module: "System"
 */
declare namespace Api {
  namespace System {
    /** role page list */
    type SysRolePageList = Common.PaginatingQueryRecord<SysRoleVo>;

    /** role vo */
    type SysRoleVo = Common.CommonRecord<{
      /** 角色名称 */
      roleName: string;
      /** 角色编码 */
      roleCode: string;
      /** 描述 */
      roleDesc?: string;
      /** 是否启用(0:禁用,1:启用) */
      status: string;
    }>;

    /** role search dto */
    type SysRoleSearchDTO = CommonType.RecordNullable<{
      /** 角色名称 */
      roleName?: string;
      /** 角色编码 */
      roleCode?: string;
    } & Api.Common.CommonSearchParams>;

    /** role form dto (新增 / 修改) */
    type SysRoleFormDTO = CommonType.RecordNullable<{
      /** 角色ID(修改时必填) */
      id?: string;
      /** 角色名称 */
      roleName: string;
      /** 角色编码 */
      roleCode: string;
      /** 描述 */
      roleDesc?: string;
      /** 是否启用(0:禁用,1:启用) */
      status: string;
      /** 权限按钮ID列表 */
      permissionIds?: number[];
    }>;
  }
}
