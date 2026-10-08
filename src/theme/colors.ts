export const lightColors = {
  cyan: '#21D4B4',
  cyan50: '#F4FDFA',
  black: '#1C1B1B',
  white: '#FFFFFF',
  grey50: '#F4F5FD',
  grey100: '#C0C0C0',
  grey150: '#6F7384',
  border: '#F4F5FD',
  red: '#EE4D4D',
  generalCyan50: '#F4FDFA',
  blue: '#1F88DA',
  purple: '#4F1FDA',
  yellow: '#EBEF14',
  orange: '#F0821D',
  merigold: '#FFCB45',
  brown: '#5A1A05',
  pink: '#CE1DEB',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#1C1B1B',
  secondaryText: '#6F7384',
  control: '#1C1B1B',
} as const;

export const darkColors = {
  // QuickMart Figma Dark Theme
  cyan: '#21D4B4',
  cyan50: '#212322',
  black: '#1C1B1B',
  white: '#FFFFFF',
  grey50: '#282828',
  grey100: '#C0C0C0',
  grey150: '#A2A2A6',
  border: '#282828',
  red: '#EE4D4D',
  generalCyan50: '#212322',
  blue: '#1F88DA',
  purple: '#4F1FDA',
  yellow: '#EBEF14',
  orange: '#F0821D',
  merigold: '#FFCB45',
  brown: '#5A1A05',
  pink: '#CE1DEB',
  background: '#1C1B1B',
  surface: '#212322',
  text: '#FFFFFF',
  secondaryText: '#A2A2A6',
  control: '#282828',
} as const;

export type ThemeColors = {
  [K in keyof typeof lightColors]: string;
};

// Kept for compatibility with non-themed utilities and existing imports.
export const colors = lightColors;
