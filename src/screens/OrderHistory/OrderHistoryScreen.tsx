import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  useGetMyOrdersQuery,
  type MyOrder,
  type OrderStatus,
} from '../../api/orderApi';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Tab = 'Ongoing' | 'Completed';

const ONGOING_STATUSES: OrderStatus[] = [
  'Placed',
  'Accepted',
  'Out for Delivery',
];

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const getItemImage = (item: MyOrder['items'][number]) => {
  if (item.image) return item.image;

  if (item.product && typeof item.product === 'object') {
    return item.product.image;
  }

  return undefined;
};

const getItemPrice = (item: MyOrder['items'][number]) =>
  item.discountedPrice ?? item.price;

const EmptyOrdersIllustration = () => (
  <Svg width={190} height={175} viewBox="0 0 190 175" fill="none">
    <Circle cx="95" cy="86" r="58" fill="#F6F2FF" />

    <Rect
      x="64"
      y="42"
      width="62"
      height="92"
      rx="12"
      fill="#A995EA"
      transform="rotate(8 64 42)"
    />
    <Rect
      x="72"
      y="53"
      width="46"
      height="66"
      rx="5"
      fill="#E9E4FF"
      transform="rotate(8 72 53)"
    />

    <Path
      d="M82 82h27l-3 20H86l-4-20Z"
      fill="#9B86E5"
      stroke="#8C77D5"
      strokeWidth="2"
    />
    <Path
      d="M79 76h7l3 6h22"
      stroke="#8C77D5"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="89" cy="106" r="3" fill="#8C77D5" />
    <Circle cx="103" cy="106" r="3" fill="#8C77D5" />

    <Rect
      x="42"
      y="91"
      width="32"
      height="39"
      rx="4"
      fill="#5CC5DD"
      transform="rotate(-13 42 91)"
    />
    <Path
      d="M49 91c-1-13 17-17 22-4"
      stroke="#B6E8F2"
      strokeWidth="4"
      strokeLinecap="round"
    />

    <Rect
      x="113"
      y="91"
      width="43"
      height="27"
      rx="8"
      fill="#F37C86"
      transform="rotate(7 113 91)"
    />
    <Path
      d="M124 101h19M123 108h13"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
    />

    <Circle cx="138" cy="39" r="20" fill="#F6D35D" />
    <Circle
      cx="138"
      cy="39"
      r="15"
      fill="#FFE27A"
      stroke="#D5B744"
      strokeWidth="2"
    />
    <Path
      d="M138 30v18M133 34c2-2 8-2 10 1 2 4-3 5-6 6-3 1-5 3-3 5 2 3 8 2 10 0"
      stroke="#B58F28"
      strokeWidth="2"
      strokeLinecap="round"
    />

    <Path d="M51 61l3 6 6 1-5 4 1 6-5-4-6 3 2-6-4-4 6-1 2-5Z" fill="#F4D64D" />
    <Path
      d="M147 120l2 5 5 1-4 3 1 5-4-3-5 2 2-5-3-4 5 1 1-5Z"
      fill="#F4D64D"
    />
    <Path
      d="M115 128l2 5 5 1-4 3 1 5-4-3-5 2 2-5-3-4 5 1 1-5Z"
      fill="#F4D64D"
    />
  </Svg>
);

const OrderHistoryScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [activeTab, setActiveTab] = useState<Tab>('Ongoing');

  const { data, isLoading, isFetching, isError, refetch } =
    useGetMyOrdersQuery();

  const orders = useMemo(
    () => (Array.isArray(data?.data) ? data.data : []),
    [data],
  );

  const ongoingOrders = useMemo(
    () => orders.filter(order => ONGOING_STATUSES.includes(order.status)),
    [orders],
  );

  const completedOrders = useMemo(
    () => orders.filter(order => order.status === 'Delivered'),
    [orders],
  );

  const visibleOrders =
    activeTab === 'Ongoing' ? ongoingOrders : completedOrders;

  const renderOrder = (order: MyOrder) => {
    if (!order.items?.length) return null;

    return (
      <View key={order._id} style={styles.orderBlock}>
        <View style={styles.metaRow}>
          <View
            style={[
              styles.statusBadge,
              order.status === 'Delivered'
                ? styles.completedBadge
                : styles.ongoingBadge,
            ]}
          >
            <Text style={styles.statusText}>
              {order.status === 'Delivered'
                ? 'Finished'
                : 'Estimated time: 7 working days'}
            </Text>
          </View>

          {order.status === 'Delivered' ? (
            <Text style={styles.dateText}>{formatDate(order.createdAt)}</Text>
          ) : null}
        </View>

        {order.items.map((item, index) => {
          const image = getItemImage(item);
          const price = getItemPrice(item);

          return (
            <View
              key={`${order._id}-${index}`}
              style={[styles.orderItem, index > 0 && styles.additionalItem]}
            >
              <View style={styles.productImageBox}>
                {image ? (
                  <Image
                    source={{ uri: image }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imageFallback}>
                    <Text style={styles.fallbackText}>Product</Text>
                  </View>
                )}
              </View>

              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>

                <Text style={styles.price}>${price.toFixed(2)}</Text>

                {item.discountedPrice !== undefined &&
                item.discountedPrice < item.price ? (
                  <Text style={styles.oldPrice}>${item.price.toFixed(2)}</Text>
                ) : null}

                <View style={styles.quantityBox}>
                  <Text style={styles.quantityAction}>−</Text>
                  <Text style={styles.quantity}>{item.quantity}</Text>
                  <Text style={styles.quantityAction}>＋</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderEmptyState = () => {
    const completed = activeTab === 'Completed';

    return (
      <View style={styles.emptyState}>
        <EmptyOrdersIllustration />

        <Text style={styles.emptyTitle}>
          {completed ? 'No completed order' : 'No ongoing order'}
        </Text>

        <Text style={styles.emptyDescription}>
          {completed
            ? "You don't have any completed orders yet. Place an order and it will appear here."
            : "We currently don't have any active orders in progress. Feel free to explore our products and place a new order."}
        </Text>

        <Pressable
          style={styles.exploreButton}
          onPress={() =>
            navigation.navigate('MainTabs', {
              screen: 'Categories',
            })
          }
        >
          <Text style={styles.exploreButtonText}>Explore Categories</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Order History</Text>
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'Ongoing' && styles.activeTab]}
          onPress={() => setActiveTab('Ongoing')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'Ongoing' && styles.activeTabText,
            ]}
          >
            Ongoing
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'Completed' && styles.activeTab]}
          onPress={() => setActiveTab('Completed')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'Completed' && styles.activeTabText,
            ]}
          >
            Completed
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color="#21D4B4" />
        </View>
      ) : isError ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>Unable to load your orders.</Text>

          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            visibleOrders.length === 0 && styles.emptyScrollContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor="#21D4B4"
            />
          }
        >
          {visibleOrders.length > 0
            ? visibleOrders.map(renderOrder)
            : renderEmptyState()}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    height: 76,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  backButton: {
    width: 34,
    height: 42,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  backArrow: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 40,
    lineHeight: 40,
    color: '#17171A',
    marginTop: -5,
  },

  headerTitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 16,
    color: '#17171A',
    marginLeft: 8,
  },

  tabs: {
    height: 48,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F3F3FB',
    flexDirection: 'row',
  },

  tab: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeTab: {
    backgroundColor: '#1C1C1E',
  },

  tabText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: '#17171A',
  },

  activeTabText: {
    color: '#FFFFFF',
  },

  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  emptyScrollContent: {
    flexGrow: 1,
  },

  orderBlock: {
    marginBottom: 18,
  },

  metaRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  statusBadge: {
    minHeight: 25,
    paddingHorizontal: 7,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ongoingBadge: {
    backgroundColor: '#F05A5A',
  },

  completedBadge: {
    backgroundColor: '#2497D9',
  },

  statusText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 10,
    color: '#FFFFFF',
  },

  dateText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 10,
    color: '#B7B7BE',
    marginTop: 6,
  },

  orderItem: {
    flexDirection: 'row',
  },

  additionalItem: {
    marginTop: 16,
  },

  productImageBox: {
    width: 120,
    height: 120,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#EEF4F4',
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fallbackText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: '#8C909A',
  },

  productInfo: {
    flex: 1,
    paddingLeft: 8,
  },

  productName: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#17171A',
    marginBottom: 7,
  },

  price: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: '#17171A',
  },

  oldPrice: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 10,
    color: '#9EA0A7',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },

  quantityBox: {
    width: 96,
    height: 34,
    borderWidth: 1,
    borderColor: '#E9EBF2',
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 8,
  },

  quantityAction: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 18,
    color: '#B8BAC2',
  },

  quantity: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: '#B8BAC2',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },

  emptyTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: '#17171A',
    textAlign: 'center',
    marginTop: 4,
  },

  emptyDescription: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: '#7B7E88',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 330,
  },

  exploreButton: {
    width: '100%',
    height: 60,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
  },

  exploreButtonText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: '#FFFFFF',
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  errorText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: '#7B7E88',
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  retryText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: '#FFFFFF',
  },
});

export default OrderHistoryScreen;
