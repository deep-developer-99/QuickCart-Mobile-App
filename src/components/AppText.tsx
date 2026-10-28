import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { fontFamilies, QUICKCART_FONT } from '../theme/globalFont';

type FontWeight = NonNullable<TextStyle['fontWeight']>;

const fontForWeight = (fontWeight: FontWeight | undefined): string => {
  switch (fontWeight) {
    case '500':
      return fontFamilies.medium;
    case '600':
      return fontFamilies.semiBold;
    case 'bold':
    case '700':
    case '800':
    case '900':
      return fontFamilies.bold;
    default:
      // The installed family set has no Light face, so weights 100 to 400 use Regular.
      return QUICKCART_FONT;
  }
};

const withDefaultFont = (
  style: TextProps['style'] | TextInputProps['style'],
) => {
  const flattenedStyle = StyleSheet.flatten(style) as TextStyle | undefined;

  // An explicit font family wins. Otherwise use the matching bundled face for
  // fontWeight so platform font synthesis cannot silently replace the weight.
  const fontFamily = flattenedStyle?.fontFamily
    ? undefined
    : fontForWeight(flattenedStyle?.fontWeight);

  return fontFamily ? [{ fontFamily }, style] : style;
};

export const AppText = forwardRef<
  React.ComponentRef<typeof NativeText>,
  TextProps
>(function AppTextComponent({ style, ...props }, ref) {
  return <NativeText ref={ref} {...props} style={withDefaultFont(style)} />;
});

export const AppTextInput = forwardRef<
  React.ComponentRef<typeof NativeTextInput>,
  TextInputProps
>(function AppTextInputComponent({ style, ...props }, ref) {
  return (
    <NativeTextInput ref={ref} {...props} style={withDefaultFont(style)} />
  );
});
