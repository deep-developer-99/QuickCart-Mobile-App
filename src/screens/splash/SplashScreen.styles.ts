import { StyleSheet } from 'react-native';
import { typography, spacing } from '../../theme';
import type { ThemeColors } from '../../theme';

export const SplashScreenStyles = (
  colors: ThemeColors,
  mode: 'light' | 'dark',
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: mode === 'dark' ? '#000000' : '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    brand: {
      width: '100%',
      maxWidth: 360,
      justifyContent: 'center',
    },
    logo: {
      ...typography.heading1Bold,
      color: mode === 'dark' ? colors.white : '#171717',
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.6,
    },
    tagline: {
      ...typography.body2Medium,
      color: mode === 'dark' ? colors.white : '#171717',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
    },
  });
