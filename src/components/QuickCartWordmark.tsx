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
};

/** The QuickCart wordmark with the supplied Q symbol and original wordmark text. */
const QuickCartWordmark = ({
  textStyle,
  style,
  markSize = 30,
  gap = 4,
  badgeColor,
  badgeSize = markSize + 12,
}: QuickCartWordmarkProps) => (
  <View
    accessible
    accessibilityLabel="QuickCart"
    style={[styles.wordmark, { gap }, style]}
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
        <QuickCartMark width={(markSize * 31) / 32} height={markSize} />
      </View>
    ) : (
      <QuickCartMark width={(markSize * 31) / 32} height={markSize} />
    )}
    <AppText accessible={false} numberOfLines={1} style={textStyle}>
      uickCart
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

export default QuickCartWordmark;
