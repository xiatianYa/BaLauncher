declare namespace Api {
  namespace Bot {
    /** 群配置信息（对应 Java BotGroup） */
    type Group = {
      /** 主键ID */
      id: string;
      /** QQ群号 */
      groupId: string;
      /** 生效开始时间 */
      startTime: string;
      /** 到期时间 */
      expireTime: string;
      /** 是否开启换图通知(0:关闭,1:开启) */
      isNotifyImage: number;
      /** 偏好社区，多个使用逗号分隔 */
      communitys: string;
      /** 创建用户ID */
      createUserId: string;
      /** 创建时间 */
      createTime: string;
      /** 修改用户ID */
      updateUserId: string;
      /** 修改时间 */
      updateTime: string;
      /** 是否删除(0:否,1:是) */
      isDeleted: number;
    };

    /** 机器人群分页结果 */
    type BotGroupPageList = Common.PaginatingQueryRecord<BotGroupVo>;

    /** 机器人群 Vo */
    type BotGroupVo = Group;

    /** 机器人群搜索参数 */
    type BotGroupSearchDTO = CommonType.RecordNullable<{
      /** QQ群号 */
      groupId?: string;
    } & Api.Common.CommonSearchParams>;
  }
}
