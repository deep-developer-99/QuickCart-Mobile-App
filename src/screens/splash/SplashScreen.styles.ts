import { StyleSheet } from 'react-native';
import { typography, spacing } from '../../theme';
import type { ThemeColors } from '../../theme';

export const SplashScreenStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.cyan,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xxl,
    },

    logo: {
      ...typography.heading1Bold,
      color: colors.white,
    },

    tagline: {
      ...typography.body2Regular,
      color: colors.white,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
  });
