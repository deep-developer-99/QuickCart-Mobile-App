import { StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../../theme';

export const OTPScreenStyles = StyleSheet.create({
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

  description: {
    ...typography.body2Regular,
    color: colors.grey150,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.huge,
  },

  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: colors.grey100,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    ...typography.body1Medium,
    color: colors.black,
  },

  verifyButton: {
    height: 56,
    marginTop: spacing.xxxl,
    borderRadius: radius.md,
    backgroundColor: colors.cyan,
    justifyContent: 'center',
    alignItems: 'center',
  },

  verifyButtonDisabled: {
    opacity: 0.5,
  },

  verifyButtonText: {
    ...typography.button1,
    color: colors.white,
  },

  resendText: {
    ...typography.button2,
    color: colors.cyan,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
