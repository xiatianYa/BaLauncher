// 游戏设置存储键
export const GAME_STORAGE_KEYS = {
  /** 游戏平台（international 国际服 / 国服等） */
  GAME_PLATFORM: 'GamePlatform' as const,
  /** CS2 游戏安装路径 */
  CSGO2_PATH: 'csgo2Path' as const,
  /** Steam 安装路径 */
  STEAM_PATH: 'steamPath' as const,
  /** 自动加入服务器配置（目标服务器、启动参数等） */
  AUTOMATIC_JOIN_CONFIG: 'automaticJoinConfig' as const,
  /** 待应用/已应用的按键绑定项 */
  APPLY_KEY_BIND_ITEMS: 'applyKeyBindItems' as const,
  /** 用户选中的自定义启动项 */
  SELECTED_START_ITEMS: 'selectedStartItems' as const,
  /** 是否全屏启动游戏 */
  IS_FULLSCREEN: 'isFullscreen' as const,
  /** 服务器列表视图模式（cardModel 卡片 / tableModel 表格） */
  SERVER_VIEW_MODULE: 'serverViewModule' as const,
  /** 当前选中的社区 ID */
  SELECTED_COMMUNITY_ID: 'selectedCommunityId' as const,
  /** 社区自定义排序 */
  COMMUNITY_ORDER: 'communityOrder' as const
};

// 应用设置存储键
export const APP_STORAGE_KEYS = {
  /** 主题名（如蓝色主题等） */
  THEME: 'theme' as const,
  /** 主题方案（dark 深色 / light 浅色） */
  THEME_SCHEME: 'themeScheme' as const,
  /** 全局音量 */
  VOLUME: 'volume' as const,
  /** 界面语言 */
  LANG: 'lang' as const,
  /** 鼠标光标样式 */
  MOUSE_CURSOR: 'mouseCursor' as const,
  /** 最小化行为（taskbar 隐藏到任务栏 / tray 隐藏到系统托盘） */
  MINIMIZE_BEHAVIOR: 'minimizeBehavior' as const,
  /** 消息提示框显示位置（九宫格 key，映射到 naive message placement） */
  MESSAGE_POSITION: 'messagePosition' as const
};

// 认证存储键
export const AUTH_STORAGE_KEYS = {
  /** 登录令牌 */
  TOKEN: 'token' as const,
  /** 刷新令牌 */
  REFRESH_TOKEN: 'refreshToken' as const,
  /** 上次登录用户 ID */
  LAST_LOGIN_USER_ID: 'lastLoginUserId' as const
};

// 路由存储键
export const ROUTE_STORAGE_KEYS = {
  /** 侧边导航路由（本地持久化的动态路由表） */
  SIDE_NAV_ROUTES: 'sideNavRoutes' as const
};

// 所有存储键的集合
export const ALL_STORAGE_KEYS = {
  ...GAME_STORAGE_KEYS,
  ...APP_STORAGE_KEYS,
  ...AUTH_STORAGE_KEYS,
  ...ROUTE_STORAGE_KEYS
};
