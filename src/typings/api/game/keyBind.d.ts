declare namespace Api {
  namespace Game {
    /** KeyBind search params */
    type KeyBindSearchParams = CommonType.RecordNullable<
      Pick<
        {
          /** 配置名称 */
          configName: string;
          /** 分享状态 */
          shareStatus: number;
          /** 用户ID */
          userId: number;
        },
        'configName' | 'shareStatus' | 'userId'
      > &
      Api.Common.CommonSearchParams
    >;

    /** KeyBind add params */
    type KeyBindAddParams = {
      /** 配置名称（便于用户区分） */
      configName: string;
      /** 按键配置JSON字符串 */
      keyConfigJson: string;
    };

    /** KeyBind update params */
    type KeyBindUpdateParams = {
      /** 配置ID */
      id: number;
      /** 配置名称（便于用户区分） */
      configName?: string;
      /** 配置描述（可选） */
      configDesc?: string;
      /** 按键配置JSON字符串 */
      keyConfigJson?: string;
    };

    /** KeyBind VO */
    type KeyBindVO = Api.Common.CommonRecord<{
      /** 配置所属用户ID（创建者） */
      userId?: number;
      /** 创建者用户名 */
      userName?: string;
      /** 创建者昵称 */
      nickName: string;
      /** 创建者头像 */
      avatar: string;
      /** 配置名称（便于用户区分） */
      configName: string;
      /** 按键配置JSON字符串 */
      keyConfigJson: string;
      /** 创建人ID */
      createUserId?: number;
      /** 修改人ID */
      updateUserId?: number;
    }>;

    /** SystemBind Vo */
    type SystemBindVO = {
      /** 系统库名称 */
      systemName: string;
      /** 系统配置图标 */
      systemIcon: string;
      /** 配置名称（便于用户区分） */
      configName: string;
      /** 配置描述（可选） */
      configDesc?: string;
    };

    /** SystemBind Cfg Vo */
    type SystemBindCfgVO = {
      /** 配置ID */
      id?: number;
      /** 系统库名称 */
      systemName: string;
      /** 系统配置图标 */
      systemIcon: string;
      /** 按键配置JSON字符串 */
      keyConfigJson: string;
      /** 配置描述 */
      configDesc?: string;
    };

    /** KeyBind item */
    type LocalKeyBindItem = {
      id: number;
      key: string;
      description: string;
    };

    /** Apply KeyBind item */
    type ApplyKeyBindItem = {
      /** 系统绑定VO */
      systemBindCfgVO?: SystemBindCfgVO;
      /** 按键绑定VO */
      keyBindVO?: KeyBindVO;
      /** 按键 */
      key: string;
      /** 按键配置原始zic */
      keyConfigJson: string;
      /** 按键配置解析后的字符串 */
      renderKeyConfigJson: string;
      /** 配置库类型(系统 | 自定义) */
      configType: string;
    };

    /** KeyBind list */
    type KeyBindList = KeyBindVO[];

    /** KeyBind page result */
    type KeyBindPageResult = Api.Common.PaginatingQueryRecord<KeyBindVO>;
  }
}
