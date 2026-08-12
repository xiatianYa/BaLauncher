/**
 * namespace System
 *
 * backend api module: "System" -> feedback
 */
declare namespace Api {
  namespace System {

    /** 反馈 VO */
    type SysFeedbackVo = Common.CommonRecord<{
      /** 用户ID */
      userId: number;
      /** 用户昵称 */
      userName: string;
      /** 反馈类型(0:问题反馈,1:功能建议,2:bug报告,3:其他) */
      feedbackType: number;
      /** 反馈标题 */
      title: string;
      /** 反馈内容详情 */
      content: string;
      /** 截图附件路径，多个使用逗号分隔 */
      images?: string;
      /** 处理状态(0:待处理,1:处理中,2:已解决,3:已关闭,4:已驳回) */
      status: number;
      /** 优先级(0:低,1:中,2:高,3:紧急) */
      priority: number;
      /** 处理人ID */
      handlerUserId?: number;
      /** 处理时间 */
      handleTime?: string;
      /** 处理备注/回复内容 */
      handleRemark?: string;
    }>;

    /** 反馈分页列表 */
    type SysFeedbackPageList = Common.PaginatingQueryRecord<SysFeedbackVo>;

    /** 反馈查询 DTO */
    type SysFeedbackSearchDTO = CommonType.RecordNullable<{
      /** 反馈类型 */
      feedbackType?: number;
      /** 处理状态 */
      status?: number;
      /** 优先级 */
      priority?: number;
      /** 反馈标题 */
      title?: string;
    } & Api.Common.CommonSearchParams>;

    /** 反馈新增 DTO */
    type SysFeedbackAddDTO = {
      /** 反馈类型(0:问题反馈,1:功能建议,2:bug报告,3:其他) */
      feedbackType: number;
      /** 反馈标题 */
      title: string;
      /** 反馈内容详情 */
      content: string;
      /** 截图附件路径，多个使用逗号分隔 */
      images?: string;
      /** 优先级(0:低,1:中,2:高,3:紧急) */
      priority?: number;
    };

    /** 反馈更新 DTO（管理员处理/修改状态） */
    type SysFeedbackUpdateDTO = CommonType.RecordNullable<{
      /** 反馈ID */
      id: number;
      /** 处理状态 */
      status?: number;
      /** 优先级 */
      priority?: number;
      /** 处理备注 */
      handleRemark?: string;
    }>;

    /** 评论 VO */
    type SysCommentVo = Common.CommonRecord<{
      /** 评论用户ID */
      userId: number;
      /** 评论用户昵称(冗余字段) */
      userName: string;
      /** 评论用户头像 */
      userAvatar?: string;
      /** 评论目标类型(1:反馈,2:帖子,3:动态,4:攻略,5:其他) */
      targetType: number;
      /** 评论目标ID(对应业务表的主键) */
      targetId: number;
      /** 评论内容 */
      content: string;
      /** 评论图片，多个使用逗号分隔 */
      images?: string;
      /** 父级评论ID(0:顶级评论,>0:子评论/回复) */
      parentId: number;
      /** 根评论ID(用于快速查询整个评论树) */
      rootId: number;
      /** 被回复的用户ID(仅子评论有效) */
      replyUserId?: number;
      /** 被回复的用户昵称(冗余字段) */
      replyUserName?: string;
      /** 点赞数 */
      likeCount: number;
      /** 点踩数 */
      dislikeCount: number;
      /** 子评论数量(冗余字段) */
      replyCount: number;
      /** 状态(0:已删除,1:正常,2:已屏蔽,3:待审核) */
      status: number;
      /** 当前用户是否已点赞 */
      isLiked?: boolean;
      /** 当前用户是否已点踩 */
      isDisliked?: boolean;
      /** 子评论列表 */
      children?: Api.System.SysCommentVo[];
    }>;

    /** 评论分页列表 */
    type SysCommentPageList = Common.PaginatingQueryRecord<SysCommentVo>;

    /** 评论新增 DTO */
    type SysCommentAddDTO = {
      /** 评论目标类型(1:反馈,2:帖子,3:动态,4:攻略,5:其他) */
      targetType: number;
      /** 评论目标ID(对应业务表的主键) */
      targetId: number;
      /** 评论内容 */
      content: string;
      /** 评论图片，多个使用逗号分隔 */
      images?: string;
      /** 父级评论ID(0:顶级评论,>0:子评论/回复) */
      parentId?: number;
      /** 被回复的用户ID(仅子评论有效) */
      replyUserId?: number;
    };

    /** 评论更新 DTO（管理员屏蔽/审核） */
    type SysCommentUpdateDTO = {
      /** 评论ID */
      id: number;
      /** 评论状态(0:正常,1:已屏蔽) */
      status: number;
    };
  }
}
