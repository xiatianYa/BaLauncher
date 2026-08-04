declare namespace Api {
  namespace Bot {
    /** 机器人群成员 */
    type BotGroupMemberVo = {
      /** 主键ID */
      id: string;
      /** QQ群号 */
      groupId: string;
      /** 群成员QQ号 */
      qq: string;
      /** 绑定的系统用户ID */
      sysUserId?: string;
      /** QQ昵称 */
      nickname?: string;
      /** 群名片 */
      groupCard?: string;
      /** 入群时间 */
      joinTime?: string;
      /** 成员身份：owner群主, admin管理员, member普通成员 */
      memberRole?: string;
      /** 创建用户ID */
      createUserId?: string;
      /** 创建时间 */
      createTime?: string;
      /** 修改用户ID */
      updateUserId?: string;
      /** 修改时间 */
      updateTime?: string;
      /** 机器人群信息 */
      botGroup?: BotGroupVo;
    };

    /** 机器人群成员分页结果 */
    type BotGroupMemberPageList = Common.PaginatingQueryRecord<BotGroupMemberVo>;

    /** 机器人群成员搜索参数 */
    type BotGroupMemberSearchDTO = CommonType.RecordNullable<{
      /** QQ群号 */
      groupId?: string;
      /** 群成员QQ号 */
      qq?: string;
      /** 绑定的系统用户ID */
      sysUserId?: string;
    }>;
  }
}
