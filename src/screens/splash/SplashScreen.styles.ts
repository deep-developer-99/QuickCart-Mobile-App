import { StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../theme';

export const SplashScreenStyles = StyleSheet.create({
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
