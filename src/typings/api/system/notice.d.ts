/**
 * namespace System
 *
 * backend api module: "System"
 */
declare namespace Api {
  namespace System {
    /** notice page list */
    type NoticePageList = Common.PaginatingQueryRecord<NoticeVo>;

    /** notice vo */
    type NoticeVo = Common.CommonRecord<{
      /** 通知类型 1=公告 2=个人消息 */
      noticeType: number;
      /** 通知标题 */
      title: string;
      /** 通知内容 */
      content: string;
      /** 发送人ID(管理员/系统) */
      senderId?: number;
      /** 接收人ID(0=全体用户) */
      receiverId: number;
      /** 阅读状态 0=未读 1=已读 */
      readStatus: number;
      /** 优先级 0=普通 1=重要 2=紧急 */
      priority: number;
      /** 业务类型(如订单、系统、活动) */
      businessType?: string;
      /** 关联业务ID(如订单ID) */
      businessId?: number;
      /** 阅读时间 */
      readTime?: string;
      /** 创建用户ID */
      createUserId: number;
      /** 修改用户ID */
      updateUserId?: number;
    }>;

    /** notice add dto */
    type SysNoticeAddDTO = {
      /** 通知类型 1=公告 2=个人消息 */
      noticeType: number;
      /** 通知标题 */
      title: string;
      /** 通知内容 */
      content: string;
      /** 接收人ID(0=全体用户) */
      receiverId?: number;
      /** 优先级 0=普通 1=重要 2=紧急 */
      priority: number;
      /** 业务类型(如订单、系统、活动) */
      businessType?: string;
      /** 关联业务ID(如订单ID) */
      businessId?: number;
    };

    /** notice update dto */
    type SysNoticeUpdateDTO = Common.CommonRecord<{
      /** 通知类型 1=公告 2=个人消息 */
      noticeType: number;
      /** 通知标题 */
      title: string;
      /** 通知内容 */
      content: string;
      /** 接收人ID(0=全体用户) */
      receiverId?: number;
      /** 优先级 0=普通 1=重要 2=紧急 */
      priority: number;
      /** 业务类型(如订单、系统、活动) */
      businessType?: string;
      /** 关联业务ID(如订单ID) */
      businessId?: number;
    }>;

    /** notice search dto */
    type SysNoticeSearchDTO = CommonType.RecordNullable<{
      /** 通知类型 1=公告 2=个人消息 */
      noticeType?: number;
      /** 通知标题 */
      title?: string; 
      /** 阅读状态 0=未读 1=已读 */
      readStatus?: number;
      /** 优先级 0=普通 1=重要 2=紧急 */
      priority?: number;
      /** 业务类型(如订单、系统、活动) */
      businessType?: string;
      /** 接收人ID */
      receiverId?: number;
    } & Api.Common.CommonSearchParams>;
  }
}
