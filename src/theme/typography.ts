import { fontFamilies } from './globalFont';

export const typography = {
  // Heading 1

  heading1Bold: {
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as const,
    letterSpacing: 0,
  },

  heading1SemiBold: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },

  heading1Regular: {
    fontFamily: fontFamilies.regular,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },

  // Heading 2

  heading2Bold: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '700' as const,
    letterSpacing: 0,
  },

  heading2SemiBold: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },

  heading2Regular: {
    fontFamily: fontFamilies.regular,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },

  // Heading 3

  heading3Bold: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700' as const,
    letterSpacing: 0.045,
  },

  heading3SemiBold: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: 0.045,
  },

  heading3Regular: {
    fontFamily: fontFamilies.regular,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '400' as const,
    letterSpacing: 0.045,
  },

  // Buttons

  button1: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },

  button2: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },

  // Body

  body1Medium: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '500' as const,
    letterSpacing: 0.08,
  },

  body1Regular: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '400' as const,
    letterSpacing: 0.08,
  },

  body2Medium: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500' as const,
    letterSpacing: 0.07,
  },

  body2Regular: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400' as const,
    letterSpacing: 0.07,
  },

  // Caption

  captionSemiBold: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.06,
  },

  captionRegular: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.06,
  },

  // Overline

  overlineSemiBold: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },

  overlineRegular: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
  },
} as const;
