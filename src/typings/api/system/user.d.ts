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
  }
}
