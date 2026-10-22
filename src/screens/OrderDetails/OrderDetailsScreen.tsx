import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import type { MyOrder, OrderStatus } from '../../api/orderApi';
import { useGetMyOrdersQuery } from '../../api/orderApi';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { radius, spacing, typography, useTheme } from '../../theme';
import type { ThemeColors } from '../../theme';

type DetailsRoute = RouteProp<RootStackParamList, 'OrderDetails'>;

const STEPS: OrderStatus[] = [
  'Placed',
  'Accepted',
  'Out for Delivery',
  'Delivered',
];

const formatDate = (date?: string) =>
  date
    ? new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const getItemImage = (item: MyOrder['items'][number]) => {
  if (item.image) return item.image;
  return item.product && typeof item.product === 'object'
    ? item.product.image
    : undefined;
};

const addressText = (address: unknown) => {
  if (!address) return 'Delivery address will be available soon';
  if (typeof address === 'string') return address;
  if (typeof address !== 'object') return String(address);
  const value = address as Record<string, unknown>;
  return (
    [
      value.name,
      value.addressLine,
      value.address,
      value.city,
      value.state,
      value.pincode,
    ]
      .filter(Boolean)
      .join(', ') || 'Delivery address will be available soon'
  );
};

const OrderDetailsScreen = () => {
  const styles = useStyles();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<DetailsRoute>();
  const { order: passedOrder, orderId } = params;
  const { data, isLoading } = useGetMyOrdersQuery(undefined, {
    skip: Boolean(passedOrder),
  });
  const order = passedOrder ?? data?.data?.find(item => item._id === orderId);
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ActivityIndicator style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Order details</Text>
        </View>
        <Text style={styles.muted}>This order is no longer available.</Text>
      </SafeAreaView>
    );
  }

  const currentStep = Math.max(0, STEPS.indexOf(order.status));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Order details</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.xxxl) },
        ]}
      >
        <View style={styles.hero}>
          <View>
            <Text style={styles.eyebrow}>
              ORDER #{order._id.slice(-8).toUpperCase()}
            </Text>
            <Text style={styles.heroTitle}>
              {order.status === 'Delivered'
                ? 'Order delivered'
                : 'Your order is on its way'}
            </Text>
            <Text style={styles.muted}>
              Placed on {formatDate(order.createdAt)}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              order.status === 'Delivered' ? styles.delivered : styles.ongoing,
            ]}
          >
            <Text style={styles.statusText}>{order.status}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order status</Text>
          <View style={styles.timeline}>
            {STEPS.map((step, index) => {
              const completed = index <= currentStep;
              return (
                <View style={styles.step} key={step}>
                  <View
                    style={[
                      styles.stepRail,
                      index < STEPS.length - 1 &&
                        index < currentStep &&
                        styles.activeRail,
                    ]}
                  />
                  <View style={[styles.stepDot, completed && styles.activeDot]}>
                    {completed ? <Text style={styles.check}>✓</Text> : null}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      completed && styles.activeStepLabel,
                    ]}
                  >
                    {step}
                  </Text>
                  {index === currentStep ? (
                    <Text style={styles.stepHint}>Current status</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
          {order.items.map((item, index) => {
            const image = getItemImage(item);
            const price = item.discountedPrice ?? item.price;
            return (
              <View
                style={[styles.item, index > 0 && styles.itemDivider]}
                key={`${order._id}-${index}`}
              >
                <View style={styles.imageBox}>
                  {image ? (
                    <Image
                      source={{ uri: image }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.imageFallback}>QC</Text>
                  )}
                </View>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemMeta}>Qty {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  ₹{(price * item.quantity).toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>{addressText(order.address)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment</Text>
            <Text style={styles.detailValue}>
              {order.paymentMethod === 'COD'
                ? 'Cash on delivery'
                : 'Online payment'}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Item total</Text>
            <Text style={styles.summaryValue}>
              ₹{order.totalAmount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery fee</Text>
            <Text style={styles.free}>FREE</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total paid</Text>
            <Text style={styles.totalValue}>
              ₹{order.totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loading: { flex: 1 },
    header: {
      height: 76,
      borderBottomWidth: 1,
      borderBottomColor: colors.grey50,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    backButton: {
      width: 34,
      height: 42,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    backArrow: {
      fontSize: 40,
      lineHeight: 40,
      color: colors.text,
      marginTop: -5,
    },
    headerTitle: {
      ...typography.body2Medium,
      color: colors.text,
      marginLeft: spacing.sm,
    },
    content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
    hero: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: spacing.md,
      marginBottom: spacing.sm,
    },
    eyebrow: {
      ...typography.overlineSemiBold,
      color: colors.secondaryText,
      marginBottom: spacing.xs,
    },
    heroTitle: {
      ...typography.heading3Bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    muted: { ...typography.captionRegular, color: colors.secondaryText },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.sm,
      marginLeft: spacing.sm,
    },
    ongoing: { backgroundColor: colors.red },
    delivered: { backgroundColor: colors.blue },
    statusText: { ...typography.overlineRegular, color: colors.white },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.grey50,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginTop: spacing.md,
    },
    sectionTitle: {
      ...typography.body2Medium,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    timeline: { paddingLeft: spacing.xs },
    step: { minHeight: 50, paddingLeft: 32, position: 'relative' },
    stepRail: {
      position: 'absolute',
      left: 8,
      top: 17,
      bottom: -4,
      width: 2,
      backgroundColor: colors.grey50,
    },
    activeRail: { backgroundColor: colors.cyan },
    stepDot: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: 18,
      height: 18,
      borderRadius: radius.pill,
      backgroundColor: colors.grey50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeDot: { backgroundColor: colors.cyan },
    check: { color: colors.white, fontSize: 11, fontWeight: '700' },
    stepLabel: { ...typography.captionRegular, color: colors.secondaryText },
    activeStepLabel: { ...typography.captionSemiBold, color: colors.text },
    stepHint: {
      ...typography.overlineRegular,
      color: colors.cyan,
      marginTop: 2,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    itemDivider: { borderTopWidth: 1, borderTopColor: colors.grey50 },
    imageBox: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      overflow: 'hidden',
      backgroundColor: colors.cyan50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    image: { width: '100%', height: '100%' },
    imageFallback: { ...typography.captionSemiBold, color: colors.cyan },
    itemCopy: { flex: 1, paddingHorizontal: spacing.md },
    itemName: { ...typography.body2Regular, color: colors.text },
    itemMeta: {
      ...typography.captionRegular,
      color: colors.secondaryText,
      marginTop: spacing.xs,
    },
    itemPrice: { ...typography.captionSemiBold, color: colors.text },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
    },
    detailLabel: {
      ...typography.captionRegular,
      color: colors.secondaryText,
      width: '28%',
    },
    detailValue: {
      ...typography.captionRegular,
      color: colors.text,
      textAlign: 'right',
      flex: 1,
    },
    summaryCard: { paddingTop: spacing.lg, marginTop: spacing.md },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    summaryLabel: { ...typography.captionRegular, color: colors.secondaryText },
    summaryValue: { ...typography.captionRegular, color: colors.text },
    free: { ...typography.overlineSemiBold, color: colors.cyan },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.grey50,
      marginTop: spacing.sm,
      paddingTop: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    totalLabel: { ...typography.body2Medium, color: colors.text },
    totalValue: { ...typography.body2Medium, color: colors.text },
  });

const useStyles = () => {
  const { theme } = useTheme();
  return React.useMemo(() => createStyles(theme.colors), [theme.colors]);
};

export default OrderDetailsScreen;
