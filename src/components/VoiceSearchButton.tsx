import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Svg, {Path, Line} from 'react-native-svg';
import {useTheme} from '../theme';

export default function VoiceSearchButton({onPress, accessibilityLabel}: {
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const {theme} = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.divider, {backgroundColor: theme.colors.grey100}]} />
      <Pressable onPress={onPress} style={styles.button} hitSlop={4}
        accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" stroke={theme.colors.secondaryText} strokeWidth={1.8} />
          <Path d="M19 11.5a7 7 0 0 1-14 0M12 18.5V22m-4 0h8" stroke={theme.colors.secondaryText} strokeWidth={1.8} strokeLinecap="round" />
          <Line x1="12" y1="2" x2="12" y2="2" stroke={theme.colors.secondaryText} />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {height: 32, flexDirection: 'row', alignItems: 'center'},
  divider: {width: StyleSheet.hairlineWidth, height: 24},
  button: {width: 40, height: 48, alignItems: 'center', justifyContent: 'center'},
});
