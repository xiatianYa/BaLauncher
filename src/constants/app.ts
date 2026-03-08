export const themeSchemaRecord: Record<UnionKey.ThemeScheme, App.I18n.I18nKey> = {
  light: 'theme.themeSchema.light',
  dark: 'theme.themeSchema.dark',
};

export type ThemeColor = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error';

export type gameStartType = 'steamexe' | 'nosteamexe';

export type gamePlatform = 'international' | 'perfect';
