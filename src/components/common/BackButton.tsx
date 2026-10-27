import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { Insets, StyleProp, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import BlackLeftArrow from '../../assets/icons/arrow-left-line.svg';
import WhiteLeftArrow from '../../assets/icons/White Left Arrow.svg';
import { useTheme } from '../../theme';

type BackButtonProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  hitSlop?: Insets | number;
  accessibilityLabel?: string;
};

const BackButton = ({
  onPress,
  style,
  hitSlop = 8,
  accessibilityLabel,
}: BackButtonProps) => {
  const { mode } = useTheme();
  const { t } = useTranslation();
  const Arrow = mode === 'dark' ? WhiteLeftArrow : BlackLeftArrow;

  return (
    <Pressable
      style={[styles.button, style]}
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? t('ui.common.back')}
    >
      <Arrow width={24} height={24} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BackButton;
