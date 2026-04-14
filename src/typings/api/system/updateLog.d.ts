/**
 * namespace System
 *
 * backend api module: "System"
 */
declare namespace Api {
  namespace System {
    /** update log page list */
    type UpdateLogPageList = Common.PaginatingQueryRecord<UpdateLogVo>;

    /** update log vo */
    type UpdateLogVo = Common.CommonRecord<{
      /** 版本号 如 V1.0.0 */
      version: string;
      /** 更新类型 1=新增功能 2=功能优化 3=BUG修复 4=其他更新 */
      updateType: string;
      /** 更新标题/简介 */
      title: string;
      /** 详细更新内容（支持富文本） */
      content?: string;
      /** 是否置顶 0=否 1=是 */
      isTop: number;
      /** 创建用户ID */
      createUserId: number;
      /** 创建时间 */
      createTime?: string;
      /** 修改用户ID */
      updateUserId?: number;
      /** 更新日期 */
      updateTime: string;
      /** 修改时间 */
      modifyTime?: string;
      /** 是否启用 0=禁用 1=启用 */
      status: number;
    }>;

    /** update log add dto */
    type SysUpdateLogAddDTO = {
      /** 版本号 如 V1.0.0 */
      version: string;
      /** 更新类型 1=新增功能 2=功能优化 3=BUG修复 4=其他更新 */
      updateType: string | null;
      /** 更新标题/简介 */
      title: string;
      /** 详细更新内容（支持富文本） */
      content?: string;
      /** 是否置顶 0=否 1=是 */
      isTop: number;
      /** 是否启用 0=禁用 1=启用 */
      status: number;
    };

    /** update log update dto */
    type SysUpdateLogUpdateDTO = {
      /** 主键ID */
      id: number;
      /** 版本号 如 V1.0.0 */
      version: string;
      /** 更新类型 1=新增功能 2=功能优化 3=BUG修复 4=其他更新 */
      updateType: string | null;
      /** 更新标题/简介 */
      title: string;
      /** 详细更新内容（支持富文本） */
      content?: string;
      /** 是否置顶 0=否 1=是 */
      isTop: number;
      /** 更新日期 */
      updateTime: string;
      /** 是否启用 0=禁用 1=启用 */
      status: number;
    };

    /** update log search dto */
    type SysUpdateLogSearchDTO = CommonType.RecordNullable<{
      /** 版本号 */
      version?: string;
      /** 更新类型 1=新增功能 2=功能优化 3=BUG修复 4=其他更新 */
      updateType?: number;
      /** 更新标题/简介 */
      title?: string;
      /** 是否置顶 0=否 1=是 */
      isTop?: number;
      /** 是否启用 0=禁用 1=启用 */
      status?: number;
    } & Api.Common.CommonSearchParams>;
  }
}
