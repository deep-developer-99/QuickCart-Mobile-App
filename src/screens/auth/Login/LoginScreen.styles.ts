import { StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../../theme';

export const LoginScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.massive,
  },

  title: {
    ...typography.heading2Bold,
    color: colors.black,
    textAlign: 'center',
  },

  subtitle: {
    ...typography.body2Regular,
    color: colors.grey150,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  inputSection: {
    marginTop: spacing.huge,
  },

  label: {
    ...typography.body2Medium,
    color: colors.black,
    marginBottom: spacing.sm,
  },

  phoneInputContainer: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.grey100,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
  },

  countryCode: {
    ...typography.body1Medium,
    color: colors.black,
    marginRight: spacing.md,
  },

  input: {
    flex: 1,
    ...typography.body1Regular,
    color: colors.black,
    paddingVertical: 0,
  },

  continueButton: {
    height: 56,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.cyan,
    justifyContent: 'center',
    alignItems: 'center',
  },

  continueButtonDisabled: {
    opacity: 0.5,
  },

  continueButtonText: {
    ...typography.button1,
    color: colors.white,
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xxxl,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.grey100,
  },

  orText: {
    ...typography.captionSemiBold,
    color: colors.grey150,
    marginHorizontal: spacing.md,
  },

  googleButton: {
    height: 56,
    borderWidth: 1,
    borderColor: colors.grey100,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.black,
    marginRight: spacing.md,
  },

  googleButtonText: {
    ...typography.button2,
    color: colors.black,
  },
});
