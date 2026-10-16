import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, useTheme } from '../theme';

type CartAddedToastProps = {
  visible: boolean;
  onViewCart: () => void;
};

const CartAddedToast = ({ visible, onViewCart }: CartAddedToastProps) => {
  const styles = useStyles();

  if (!visible) return null;

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={styles.successIcon}>
        <Text style={styles.successCheck}>✓</Text>
      </View>
      <Text style={styles.message}>The product has been added to your cart</Text>
      <Pressable onPress={onViewCart} hitSlop={8}>
        <Text style={styles.viewCart}>View Cart</Text>
      </Pressable>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['theme']['colors']) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      top: 44,
      minHeight: 54,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
      zIndex: 10,
    },
    successIcon: {
      width: 25,
      height: 25,
      borderRadius: 7,
      backgroundColor: colors.cyan,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 9,
    },
    successCheck: {
      color: colors.white,
      fontSize: 18,
      fontWeight: '700',
      lineHeight: 20,
    },
    message: {
      flex: 1,
      ...typography.captionSemiBold,
      color: colors.text,
    },
    viewCart: {
      marginLeft: spacing.sm,
      ...typography.body2Medium,
      color: colors.cyan,
    },
  });

const useStyles = () => {
  const { theme } = useTheme();
  return React.useMemo(() => createStyles(theme.colors), [theme.colors]);
};

export default CartAddedToast;
