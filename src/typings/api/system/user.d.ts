/**
 * namespace System
 *
 * backend api module: "System"
 */
declare namespace Api {
  namespace System {

    /** user search params */
    type UserSearchParams = CommonType.RecordNullable<
      Pick<Api.System.User, 'userName' | 'nickName' | 'status'> &
      Api.Common.CommonSearchParams
    >;

    /** 用户数据 */
    type User = Common.CommonRecord<{
      /** user name */
      userName: string;
      /** user nick name */
      nickName: string;
      /** user role code collection */
      userRoles: string[];
    }>;

    /** 用户列表 */
    type UserList = Common.PaginatingQueryRecord<User>;

    // 在线用户信息
    type OnLineUser = {
      avatar: string;
      id: number;
      nickName: string;
    }

    /** 用户分页列表 */
    type SysUserPageList = Common.PaginatingQueryRecord<SysUserVo>;

    /** 用户 VO */
    type SysUserVo = Common.CommonRecord<{
      /** 用户名 */
      userName: string;
      /** QQ第三方标识 */
      qqOpenId?: string;
      /** Steam第三方标识 */
      steamOpenId?: string;
      /** 昵称 */
      nickName?: string;
      /** 头像 */
      avatar?: string;
      /** 是否启用(0:禁用,1:启用) */
      status: string;
      /** 最后登录时间 */
      lastLoginTime?: string;
      /** 用户角色编码列表 */
      userRoles?: string[];
    }>;

    /** 用户查询 DTO */
    type SysUserSearchDTO = CommonType.RecordNullable<{
      /** 用户名 */
      userName?: string;
      /** 昵称 */
      nickName?: string;
      /** 邮箱 */
      userEmail?: string;
      /** 是否启用(0:禁用,1:启用) */
      status?: string;
    } & Api.Common.CommonSearchParams>;

    /** 用户表单 DTO (新增 / 修改) */
    type SysUserFormDTO = CommonType.RecordNullable<{
      /** 用户ID(修改时必填) */
      id?: string;
      /** 用户名 */
      userName: string;
      /** 昵称 */
      nickName?: string;
      /** 是否启用(0:禁用,1:启用) */
      status: string;
      /** 用户角色编码列表 */
      userRoles?: string[];
    }>;
  }
}
