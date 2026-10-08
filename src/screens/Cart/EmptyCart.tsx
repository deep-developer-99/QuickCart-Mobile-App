import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { radius, spacing, typography, useTheme } from '../../theme';
import type { ThemeColors } from '../../theme';

const EmptyCartIllustration = () => (
  <Svg width={210} height={190} viewBox="0 0 210 190" fill="none">
    <Path
      d="M36 56l2.3 5.1L43 63l-4.7 1.8L36 70l-2.3-5.2L29 63l4.7-1.9L36 56Z"
      fill="#F3E85B"
    />
    <Path
      d="M173 125l1.8 4.1 3.7 1.5-3.7 1.5-1.8 4.1-1.8-4.1-3.7-1.5 3.7-1.5 1.8-4.1Z"
      fill="#F3E85B"
    />
    <Path
      d="M161 41l1.5 3.3 3.1 1.2-3.1 1.3-1.5 3.3-1.5-3.3-3.1-1.3 3.1-1.2 1.5-3.3Z"
      fill="#F3E85B"
    />

    <Path
      d="M43 33c0-14.4 11.6-26 26-26h30c14.4 0 26 11.6 26 26v15c0 14.4-11.6 26-26 26H85l-12 12V74H69c-14.4 0-26-11.6-26-26V33Z"
      fill="#62D5EA"
    />
    <Path
      d="M43 34c0-14.4 11.6-26 26-26h30c14.4 0 26 11.6 26 26v15c0 14.4-11.6 26-26 26H85l-12 12V75H69c-14.4 0-26-11.6-26-26V34Z"
      stroke="#4AB9D0"
      strokeWidth={2}
    />

    <G rotation={8} origin="84,39">
      <Rect x="57" y="23" width="57" height="31" rx="5" fill="#62D5EA" />
      <Path
        d="M63 29h9.3c5.2 0 8 2.6 8 6.1 0 2.1-1.1 3.8-3.1 4.7 2.6.8 4.1 2.7 4.1 5.2 0 4-3.1 6.8-8.6 6.8H63V29Zm7 5v5.1h2.8c2 0 3.1-1 3.1-2.6 0-1.6-1.1-2.5-3.1-2.5H70Zm0 9.6v5.1h3.3c2.1 0 3.3-1 3.3-2.6 0-1.7-1.2-2.5-3.3-2.5H70Z"
        fill="#F4F4F4"
      />
      <Path
        d="M86 29h7v18.2h-7V29Zm12.2 0h7l6.2 11.4V29h6.6v18.2h-7l-6.2-11.3v11.3h-6.6V29Z"
        fill="#F4F4F4"
      />
    </G>

    <Path
      d="M77 62h35c4.1 0 7.5 3.3 7.5 7.5V73"
      stroke="#6C52C9"
      strokeWidth={8}
      strokeLinecap="round"
    />
    <Path
      d="M112 70h25"
      stroke="#6C52C9"
      strokeWidth={8}
      strokeLinecap="round"
    />

    <Path
      d="M55 76h105l-10 58c-.9 5.3-5.5 9.2-10.9 9.2H72.2c-5.4 0-10-3.9-10.9-9.2L55 76Z"
      fill="#8067DD"
    />
    <Path
      d="M59 83h96l-6.8 39.4c-.8 4.5-4.7 7.8-9.3 7.8H74.1c-4.7 0-8.6-3.3-9.4-7.9L59 83Z"
      fill="#846BE2"
    />
    <Path
      d="M61 78h98"
      stroke="#6A51C7"
      strokeWidth={7}
      strokeLinecap="round"
    />

    <Path
      d="M71 142h72c6 0 11 4.8 11 10.8v2.7H83"
      stroke="#8067DD"
      strokeWidth={8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M83 155h-7c-4.5 0-8-3.6-8-8v-1"
      stroke="#8067DD"
      strokeWidth={7}
      strokeLinecap="round"
    />

    <Ellipse cx="82" cy="168" rx="11" ry="15" fill="#B7B6BE" />
    <Ellipse cx="82" cy="165" rx="8" ry="12" fill="#D2D1D5" />
    <Ellipse cx="141" cy="168" rx="11" ry="15" fill="#B7B6BE" />
    <Ellipse cx="141" cy="165" rx="8" ry="12" fill="#D2D1D5" />
    <Ellipse cx="172" cy="154" rx="8" ry="11" fill="#B7B6BE" />
    <Ellipse cx="172" cy="152" rx="6" ry="9" fill="#D2D1D5" />

    <G>
      <Circle cx="169" cy="55" r="8" fill="#6BE5B0" />
      <Circle cx="169" cy="55" r="4" fill="#F7FFF9" />
      <Path
        d="M146 64c0-13 8-22 21-22s22 9 22 22v15l6 6c1.8 2 .4 5.2-2.3 5.2h-51.4c-2.7 0-4.1-3.2-2.3-5.2l6-6V64Z"
        fill="#66DDAA"
      />
      <Path d="M144 80h50l-4 9h-42l-4-9Z" fill="#4FCB98" />
      <Path
        d="M153 94c2.5 7 12.5 8.5 16 1"
        stroke="#4FCB98"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <Path
        d="M146 64c-3-3-7-4-10-2M190 65c4-2 7-1 10 2"
        stroke="#D8DCE4"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx="198" cy="39" r="10" fill="#EF8E98" />
    </G>

    <Path
      d="M198 33c3.6 0 6 2.5 6 6s-2.4 6-6 6-6-2.5-6-6 2.4-6 6-6 6 2.5 6 6Z"
      fill="#EF8E98"
    />
    <Path d="M196.6 35.5h2.2v7h-2.2v-7Z" fill="#FFF" />

    <Line x1="132" y1="46" x2="128" y2="40" stroke="#D9DCE5" strokeWidth={2} />
    <Line x1="139" y1="41" x2="139" y2="34" stroke="#D9DCE5" strokeWidth={2} />
    <Line x1="147" y1="43" x2="151" y2="37" stroke="#D9DCE5" strokeWidth={2} />
  </Svg>
);

const EmptyCart = () => {
  const styles = useStyles();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <View style={styles.container}>
      <View style={styles.illustration}>
        <EmptyCartIllustration />
      </View>

      <Text style={styles.title}>Your cart is empty</Text>

      <Text style={styles.description}>
        Looks like you have not added anything in your cart. Go ahead and
        explore top categories.
      </Text>

      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('Categories')}
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
      paddingTop: 55,
    },
    illustration: {
      width: 210,
      height: 190,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...typography.heading2Bold,
      color: colors.text,
      marginTop: 18,
      textAlign: 'center',
    },
    description: {
      ...typography.body2Regular,
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: 12,
      maxWidth: 330,
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

export default EmptyCart;
