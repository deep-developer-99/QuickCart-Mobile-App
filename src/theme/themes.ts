import { darkColors, lightColors } from './colors';

export const lightTheme = {
  mode: 'light' as const,
  colors: lightColors,
};

export const darkTheme = {
  mode: 'dark' as const,
  colors: darkColors,
};

export type AppTheme = typeof lightTheme | typeof darkTheme;
