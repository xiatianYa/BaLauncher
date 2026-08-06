/**
 * namespace System
 *
 * backend api module: "System"
 */
declare namespace Api {
  namespace System {
    /** 系统通知分页对象 */
    type NoticePageList = Common.PaginatingQueryRecord<SysNoticeVo>;

    /** 系统通知 VO（已读状态为当前用户视角） */
    type SysNoticeVo = Common.CommonRecord<{
      /** 通知类型 1=公告 2=个人消息 */
      noticeType: number;
      /** 通知标题 */
      title: string;
      /** 通知内容 */
      content: string;
      /** 发送人ID(管理员/系统) */
      senderId?: number;
      /** 接收类型 0=全体 1=指定用户 2=按角色 3=按分组 */
      receiverType?: number;
      /** 接收人ID(0=全体) */
      receiverId?: number;
      /** 优先级 0=普通 1=重要 2=紧急 */
      priority?: number;
      /** 状态 0=草稿 1=已发布 2=已下线 */
      status?: number;
      /** 业务类型(如订单、系统、活动) */
      businessType?: string;
      /** 关联业务ID */
      businessId?: number;
      /** 跳转类型 */
      jumpType?: string;
      /** 跳转参数(JSON) */
      jumpParams?: unknown;
      /** 过期时间 */
      expireTime?: string;
      /** 是否已读（当前用户视角，后端返回） */
      isRead?: boolean;
      /** 阅读时间 */
      readTime?: string;
    }>;

    /** 系统通知新增 DTO */
    type SysNoticeAddDTO = {
      /** 通知类型 1=公告 2=个人消息 */
      noticeType: number;
      /** 通知标题 */
      title: string;
      /** 通知内容 */
      content: string;
      /** 接收类型 0=全体 1=指定用户 2=按角色 3=按分组 */
      receiverType?: number;
      /** 接收人ID(0=全体) */
      receiverId?: number;
      /** 优先级 0=普通 1=重要 2=紧急 */
      priority?: number;
      /** 业务类型 */
      businessType?: string;
      /** 关联业务ID */
      businessId?: number;
      /** 跳转类型 */
      jumpType?: string;
      /** 跳转参数 */
      jumpParams?: unknown;
      /** 过期时间 */
      expireTime?: string;
    };

    /** 系统通知修改 DTO */
    type SysNoticeUpdateDTO = {
      /** 主键ID */
      id: number;
      /** 通知类型 1=公告 2=个人消息 */
      noticeType: number;
      /** 通知标题 */
      title: string;
      /** 通知内容 */
      content: string;
      /** 接收类型 0=全体 1=指定用户 2=按角色 3=按分组 */
      receiverType?: number;
      /** 接收人ID(0=全体) */
      receiverId?: number;
      /** 优先级 0=普通 1=重要 2=紧急 */
      priority?: number;
      /** 业务类型 */
      businessType?: string;
      /** 关联业务ID */
      businessId?: number;
      /** 跳转类型 */
      jumpType?: string;
      /** 跳转参数 */
      jumpParams?: unknown;
      /** 过期时间 */
      expireTime?: string;
    };

    /** 系统通知查询 DTO */
    type SysNoticeSearchDTO = CommonType.RecordNullable<{
      /** 通知标题 */
      title?: string;
      /** 通知类型 1=公告 2=个人消息 */
      noticeType?: number;
      /** 优先级 0=普通 1=重要 2=紧急 */
      priority?: number;
      /** 状态 0=草稿 1=已发布 2=已下线 */
      status?: number;
    } & Api.Common.CommonSearchParams>;
  }
}
