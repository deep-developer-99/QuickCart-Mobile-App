import React from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import QuickCartMark from '../assets/icons/quickcart-mark.svg';
import { AppText } from './AppText';

type QuickCartWordmarkProps = {
  textStyle: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  markSize?: number;
  gap?: number;
  badgeColor?: string;
  badgeSize?: number;
  tagline?: string;
  taglineStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

/** The QuickCart wordmark with the supplied Q symbol and original wordmark text. */
const QuickCartWordmark = ({
  textStyle,
  style,
  markSize = 30,
  gap = 4,
  badgeColor,
  badgeSize = markSize + 12,
  tagline,
  taglineStyle,
  accessibilityLabel,
}: QuickCartWordmarkProps) => (
  <View
    accessible
    accessibilityLabel={
      accessibilityLabel ?? (tagline ? `QuickCart. ${tagline}` : 'QuickCart')
    }
    style={[
      styles.wordmark,
      tagline ? styles.wordmarkWithTagline : undefined,
      { gap },
      style,
    ]}
  >
    {badgeColor ? (
      <View
        style={[
          styles.badge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: badgeColor,
          },
        ]}
      >
        <QuickCartMark
          width={(markSize * 31) / 32}
          height={markSize}
          style={tagline ? styles.markWithTagline : undefined}
        />
      </View>
    ) : (
      <QuickCartMark
        width={(markSize * 31) / 32}
        height={markSize}
        style={tagline ? styles.markWithTagline : undefined}
      />
    )}
    <View style={styles.textColumn}>
      <AppText
        accessible={false}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        numberOfLines={1}
        style={textStyle}
      >
        uickCart
      </AppText>
      {tagline ? (
        <AppText
          accessible={false}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          numberOfLines={1}
          style={[styles.tagline, taglineStyle]}
        >
          {tagline}
        </AppText>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '100%',
  },
  wordmarkWithTagline: {
    alignItems: 'flex-start',
  },
  markWithTagline: {
    marginTop: 0,
  },
  textColumn: {
    flexShrink: 1,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tagline: {
    marginTop: 2,
  },
});

export default QuickCartWordmark;
