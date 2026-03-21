// 游戏设置存储键
export const GAME_STORAGE_KEYS = {
  GAME_PLATFORM: 'GamePlatform' as const,
  CSGO2_PATH: 'csgo2Path' as const,
  STEAM_PATH: 'steamPath' as const,
  AUTOMATIC_JOIN_CONFIG: 'automaticJoinConfig' as const,
  APPLY_KEY_BIND_ITEMS: 'applyKeyBindItems' as const,
  SELECTED_START_ITEMS: 'selectedStartItems' as const
};

// 应用设置存储键
export const APP_STORAGE_KEYS = {
  THEME: 'theme' as const,
  VOLUME: 'volume' as const,
  LANG: 'lang' as const
};

// 认证存储键
export const AUTH_STORAGE_KEYS = {
  TOKEN: 'token' as const,
  REFRESH_TOKEN: 'refreshToken' as const,
  LAST_LOGIN_USER_ID: 'lastLoginUserId' as const
};

// 路由存储键
export const ROUTE_STORAGE_KEYS = {
  SIDE_NAV_ROUTES: 'sideNavRoutes' as const
};

// 所有存储键的集合
export const ALL_STORAGE_KEYS = {
  ...GAME_STORAGE_KEYS,
  ...APP_STORAGE_KEYS,
  ...AUTH_STORAGE_KEYS,
  ...ROUTE_STORAGE_KEYS
};
