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

const bundledFontFamilies = new Set<string>(Object.values(fontFamilies));

const withDefaultFont = (
  style: TextProps['style'] | TextInputProps['style'],
) => {
  const flattenedStyle = StyleSheet.flatten(style) as TextStyle | undefined;

  // The bundled faces are separate static TTF files named after their
  // PostScript names. Android's asset font manager treats fontWeight as a
  // request for a variant suffix (for example, `_bold`) on fontFamily. Passing
  // both `PlusJakartaSans-Bold` and `fontWeight: '700'` therefore looks for a
  // missing `PlusJakartaSans-Bold_bold.ttf` and falls back to the system face.
  // Resolve the face once and let the selected static file carry its weight.
  const explicitFamily = flattenedStyle?.fontFamily;
  if (explicitFamily && bundledFontFamilies.has(explicitFamily)) {
    return [style, { fontWeight: 'normal' as const }];
  }

  if (explicitFamily) return style;

  return [style, {
    fontFamily: fontForWeight(flattenedStyle?.fontWeight),
    fontWeight: 'normal' as const,
  }];
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
