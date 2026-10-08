import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { radius, spacing, typography, useTheme } from '../../theme';
import type { ThemeColors } from '../../theme';

/**
 * Figma-style empty wishlist illustration.
 * Kept inside the component so there is no external PNG/SVG asset dependency.
 */
const EmptyWishlistIllustration = () => (
  <Svg width={230} height={205} viewBox="0 0 230 205" fill="none">
    {/* Stars */}
    <Path
      d="M54 38l2.2 5 5 2.2-5 2.2-2.2 5-2.2-5-5-2.2 5-2.2 2.2-5Z"
      fill="#F2E75B"
    />
    <Path
      d="M190 68l1.7 3.8 3.8 1.7-3.8 1.7-1.7 3.8-1.7-3.8-3.8-1.7 3.8-1.7 1.7-3.8Z"
      fill="#F2E75B"
    />
    <Path
      d="M201 138l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5 1.5-3.5Z"
      fill="#F2E75B"
    />

    {/* Shopping bag handles */}
    <Path
      d="M84 72V48c0-14 9-23 21-23s21 9 21 23v24"
      stroke="#C9C5D1"
      strokeWidth={8}
      strokeLinecap="round"
    />
    <Path
      d="M101 69V46c0-13 8-21 19-21s19 8 19 21v25"
      stroke="#D9D5DF"
      strokeWidth={8}
      strokeLinecap="round"
    />

    {/* Main purple shopping bag */}
    <Path
      d="M58 70c0-5 4-9 9-9h83c5 0 9 4 9 9l-5 91c-.6 10-8.8 17-18.8 17H77.8c-10 0-18.2-7-18.8-17l-1-91Z"
      fill="#8C74DC"
    />
    <Path
      d="M66 77h85l-4.5 79c-.4 7-6.2 12-13.2 12H82c-7 0-12.7-5-13.1-12L66 77Z"
      fill="#9078E2"
    />

    {/* Bag top */}
    <Path d="M61 67h94v22H61V67Z" fill="#7659CF" />

    {/* Awning / gift-shop stripes */}
    <Path d="M68 67h20v30H73c-3 0-5-2.5-5-5V67Z" fill="#EF7B83" />
    <Path d="M88 67h21v30H88V67Z" fill="#F8E7EA" />
    <Path d="M109 67h21v30h-21V67Z" fill="#EF7B83" />
    <Path d="M130 67h20v25c0 3-2 5-5 5h-15V67Z" fill="#F8E7EA" />

    {/* Door */}
    <Rect x="93" y="101" width="34" height="59" rx="2" fill="#E6E2EF" />
    <Circle cx="121" cy="131" r="3" fill="#8C74DC" />

    {/* Heart badge */}
    <Circle cx="48" cy="88" r="25" fill="#E85F6B" />
    <Circle cx="50" cy="85" r="23" fill="#F27C87" />
    <Path
      d="M50 98c-2.5-2-13-8.7-13-16.2 0-4.6 3.3-8 7.6-8 2.5 0 4.8 1.2 6.1 3.2 1.3-2 3.6-3.2 6.1-3.2 4.3 0 7.6 3.4 7.6 8C64.4 89.3 53 96.1 50 98Z"
      fill="#FFF7F8"
    />

    {/* Rating/review bubble */}
    <G>
      <Rect x="140" y="42" width="62" height="33" rx="7" fill="#62D5AC" />
      <Path d="M157 75l-3 10 10-10h-7Z" fill="#62D5AC" />
      <Circle cx="153" cy="57" r="2.4" fill="#FFF" />
      <Circle cx="165" cy="57" r="2.4" fill="#FFF" />
      <Circle cx="177" cy="57" r="2.4" fill="#FFF" />
      <Circle cx="189" cy="57" r="2.4" fill="#FFF" />
    </G>

    {/* Small shopping basket */}
    <G rotation={-8} origin="171,137">
      <Path d="M148 126h47l-7 43h-32l-8-43Z" fill="#2BA9D1" />
      <Path d="M153 132h38l-5 31h-27l-6-31Z" fill="#39BCE0" />
      <Path
        d="M157 126c0-15 8-23 15-23s15 8 15 23"
        stroke="#35A5CC"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <Path
        d="M162 132v31M174 132v31M186 132v31"
        stroke="#D9F6FC"
        strokeWidth={2}
        opacity={0.8}
      />
    </G>

    {/* Ground shadow */}
    <Ellipse cx="118" cy="187" rx="67" ry="6" fill="#E8E7EC" opacity={0.55} />
  </Svg>
);

const EmptyWishlist = () => {
  const styles = useStyles();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { width } = useWindowDimensions();

  return (
    <View style={styles.container}>
      <View style={styles.illustration}>
        <EmptyWishlistIllustration />
      </View>

      <Text style={styles.title}>Your wishlist is empty</Text>

      <Text
        style={[styles.description, { maxWidth: Math.min(width - 48, 330) }]}
      >
        Tap heart button to start saving your favorite items.
      </Text>

      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('Categories')}
        accessibilityRole="button"
        accessibilityLabel="Explore Categories"
      >
        <Text style={styles.buttonText}>Explore Categories</Text>
      </Pressable>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: 92,
    },
    illustration: {
      width: 230,
      height: 205,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...typography.heading2Bold,
      color: colors.text,
      marginTop: 26,
      textAlign: 'center',
    },
    description: {
      ...typography.body2Regular,
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: 12,
      lineHeight: 22,
    },
    button: {
      width: '100%',
      height: 60,
      marginTop: 24,
      borderRadius: radius.md,
      backgroundColor: colors.black,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      ...typography.button2,
      color: colors.white,
    },
  });

const useStyles = () => {
  const { theme } = useTheme();
  return React.useMemo(() => createStyles(theme.colors), [theme.colors]);
};

export default EmptyWishlist;
