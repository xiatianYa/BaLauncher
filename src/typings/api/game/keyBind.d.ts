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
      /** 配置描述（可选） */
      configDesc?: string;
      /** 按键配置JSON字符串 */
      keyConfigJson: string;
      /** 分享状态(0:未分享,1:已分享,2:已取消) */
      shareStatus: number;
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
      /** 分享状态(0:未分享,1:已分享,2:已取消) */
      shareStatus?: number;
    };

    /** KeyBind VO */
    type KeyBindVO = Api.Common.CommonRecord<{
      /** 发布人名称 */
      nickName: string;
      /** 发布人头像 */
      avatar: string;
      /** 配置名称（便于用户区分） */
      configName: string;
      /** 配置描述（可选） */
      configDesc?: string;
      /** 按键配置JSON字符串 */
      keyConfigJson: string;
      /** 配置类型 */
      gameModelType: string;
      /** 分享状态(0:未分享,1:已分享) */
      shareStatus: number;
      /** 配置被分享/使用次数 */
      shareCount: number;
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
