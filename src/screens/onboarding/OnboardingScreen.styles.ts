import { StyleSheet, Dimensions } from 'react-native';
import { spacing, typography, radius } from '../../theme';
import type { ThemeColors } from '../../theme';

const { width } = Dimensions.get('window');

export const OnboardingScreenStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.white,
    },

    slide: {
      width,
      flex: 1,
      paddingHorizontal: spacing.xxl,
      justifyContent: 'center',
      alignItems: 'center',
    },

    imagePlaceholder: {
      width: '100%',
      height: 280,
      backgroundColor: colors.cyan50,
      borderRadius: radius.xxl,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xxxl,
    },

    imagePlaceholderText: {
      ...typography.heading2SemiBold,
      color: colors.cyan,
    },

    title: {
      ...typography.heading2Bold,
      color: colors.black,
      textAlign: 'center',
    },

    description: {
      ...typography.body2Regular,
      color: colors.grey150,
      textAlign: 'center',
      marginTop: spacing.md,
    },

    bottomSection: {
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xxxl,
      alignItems: 'center',
    },

    dots: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xl,
    },

    activeDot: {
      width: 24,
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.cyan,
      marginHorizontal: spacing.xs,
    },

    dot: {
      width: 8,
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.grey100,
      marginHorizontal: spacing.xs,
    },

    button: {
      width: '100%',
      height: 52,
      backgroundColor: colors.cyan,
      borderRadius: radius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },

    buttonText: {
      ...typography.button1,
      color: colors.white,
    },
  });
