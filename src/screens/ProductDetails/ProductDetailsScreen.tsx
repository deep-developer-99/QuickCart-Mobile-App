import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAddToCartMutation } from '../../api/quickCartApi';

type ProductDetailsRouteProp = RouteProp<RootStackParamList, 'ProductDetails'>;

type DetailProduct = {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  images?: string[];
  price: number;
  discountPrice?: number;
  stock: number;
  rating?: number;
  reviews?: number;
};

const CartIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3.5 4h2l1.8 10.2a2 2 0 0 0 2 1.7h6.9a2 2 0 0 0 1.9-1.4L20 7H6.2"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 19.2h.01M17 19.2h.01"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </Svg>
);

const BackIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path
      d="m15 5-7 7 7 7"
      stroke="#17171A"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HeartIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.8 8.8c0 5.2-8.8 10-8.8 10s-8.8-4.8-8.8-10A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="1.7"
    />
  </Svg>
);

const ProductDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const route = useRoute<ProductDetailsRouteProp>();
  const insets = useSafeAreaInsets();
  const [addToCart, { isLoading: addingToCart }] = useAddToCartMutation();

  const product = route.params.product as DetailProduct;
  const [quantity, setQuantity] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [showAddedMessage, setShowAddedMessage] = useState(false);

  const images = useMemo(() => {
    const list = Array.isArray(product.images)
      ? product.images.filter(Boolean)
      : [];
    if (list.length > 0) return list;
    return product.image ? [product.image] : [];
  }, [product.images, product.image]);

  const sellingPrice = product.discountPrice ?? product.price;
  const hasDiscount =
    product.discountPrice !== undefined &&
    product.discountPrice < product.price;

  const description =
    product.description?.trim() ||
    'This product is designed with quality materials and made for comfortable everyday use.';

  const shouldCollapse = description.length > 220;
  const visibleDescription =
    expanded || !shouldCollapse
      ? description
      : `${description.slice(0, 220).trim()}...`;

  const handleBuyNow = () => {
    navigation.navigate('Checkout', {
      mode: 'buyNow',
      product,
      quantity,
    });
  };

  const handleAddToCart = async () => {
    try {
      await addToCart({
        productId: product._id,
        quantity,
      }).unwrap();

      setShowAddedMessage(true);
      setTimeout(() => setShowAddedMessage(false), 2800);
    } catch (error) {
      console.error('Failed to add product to cart:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 112 + insets.bottom }}
      >
        <View style={styles.imageSection}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={event => {
                const imageWidth = event.nativeEvent.layoutMeasurement.width;
                if (imageWidth > 0) {
                  setActiveImage(
                    Math.round(event.nativeEvent.contentOffset.x / imageWidth),
                  );
                }
              }}
            >
              {images.map((uri, index) => (
                <Image
                  key={`${uri}-${index}`}
                  source={{ uri }}
                  style={[styles.productImage, { width }]}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.fallbackText}>No image</Text>
            </View>
          )}

          <View style={[styles.topControls, { top: insets.top + 6 }]}>
            <Pressable
              style={styles.iconCircle}
              onPress={() => navigation.goBack()}
            >
              <BackIcon />
            </Pressable>
            <Pressable style={styles.heartCircle}>
              <HeartIcon />
            </Pressable>
          </View>

          {images.length > 1 ? (
            <View style={styles.imageDots}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === activeImage && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.sheet}>
          <View style={styles.badges}>
            <Text style={styles.topRated}>Top Rated</Text>
            <Text style={styles.freeShipping}>Free Shipping</Text>
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.title}>{product.name}</Text>
            <View style={styles.priceBlock}>
              <Text style={styles.price}>₹ {sellingPrice.toFixed(2)}</Text>
              {hasDiscount ? (
                <Text style={styles.originalPrice}>
                  ₹ {product.price.toFixed(2)}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.ratingRow}>
            <Text style={styles.stars}>★★★★★</Text>
            <Text style={styles.ratingText}>
              {product.rating !== undefined
                ? `${product.rating.toFixed(1)}${
                    product.reviews !== undefined
                      ? ` (${product.reviews.toLocaleString()} reviews)`
                      : ''
                  }`
                : '4.5'}
            </Text>
          </View>

          <Text style={styles.description}>
            {visibleDescription}
            {shouldCollapse ? (
              <Text
                style={styles.readMore}
                onPress={() => setExpanded(value => !value)}
              >
                {expanded ? ' Read less' : ' Read more'}
              </Text>
            ) : null}
          </Text>

          <Text style={styles.quantityLabel}>Quantity</Text>
          <View style={styles.quantityControl}>
            <Pressable
              style={styles.quantityButton}
              onPress={() => setQuantity(value => Math.max(1, value - 1))}
              disabled={quantity <= 1}
            >
              <Text
                style={[
                  styles.quantityButtonText,
                  quantity <= 1 && styles.disabledText,
                ]}
              >
                −
              </Text>
            </Pressable>
            <Text style={styles.quantityValue}>{quantity}</Text>
            <Pressable
              style={styles.quantityButton}
              onPress={() =>
                setQuantity(value => Math.min(product.stock || 1, value + 1))
              }
              disabled={quantity >= (product.stock || 1)}
            >
              <Text
                style={[
                  styles.quantityButtonText,
                  quantity >= (product.stock || 1) && styles.disabledText,
                ]}
              >
                +
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {showAddedMessage ? (
        <View style={[styles.addedMessage, { top: insets.top + 44 }]}>
          <View style={styles.successIcon}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={styles.addedText}>
            The product has been added to your cart
          </Text>
          <Pressable
            onPress={() => navigation.navigate('MainTabs', { screen: 'Cart' })}
          >
            <Text style={styles.viewCart}>View Cart</Text>
          </Pressable>
        </View>
      ) : null}

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <Pressable
          style={[styles.buyButton, addingToCart && styles.buyButtonDisabled]}
          onPress={handleBuyNow}
          disabled={addingToCart}
        >
          {addingToCart ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buyText}>Buy Now</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.addButton, addingToCart && styles.addButtonDisabled]}
          onPress={handleAddToCart}
          disabled={addingToCart}
        >
          {addingToCart ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.addText}>Add To Cart</Text>
              <CartIcon />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  imageSection: {
    height: 290,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  productImage: { height: 290 },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3F5',
  },
  fallbackText: { color: '#777C8D', fontSize: 14 },
  topControls: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#17171A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageDots: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C8CBD1',
    marginHorizontal: 2,
  },
  activeDot: { backgroundColor: '#21D4B4' },
  sheet: {
    marginTop: -20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 22,
    minHeight: 520,
  },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 9 },
  topRated: {
    backgroundColor: '#168CE2',
    color: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 7,
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  freeShipping: {
    backgroundColor: '#08D38D',
    color: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 7,
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  title: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    lineHeight: 24,
    color: '#17171A',
  },
  priceBlock: { alignItems: 'flex-end', minWidth: 82 },
  price: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: '#17171A',
  },
  originalPrice: {
    marginTop: 2,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: '#777C8D',
    textDecorationLine: 'line-through',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 9 },
  stars: { color: '#FFB72B', fontSize: 12, letterSpacing: 1 },
  ratingText: {
    marginLeft: 5,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: '#17171A',
  },
  description: {
    marginTop: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: '#777C8D',
  },
  readMore: {
    color: '#21D4B4',
    fontFamily: 'PlusJakartaSans-Medium',
  },
  quantityLabel: {
    marginTop: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: '#17171A',
  },
  quantityControl: {
    width: 96,
    height: 33,
    borderWidth: 1,
    borderColor: '#E7E9F0',
    borderRadius: 8,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityButton: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: { fontSize: 21, color: '#17171A', lineHeight: 22 },
  disabledText: { color: '#C8CBD1' },
  quantityValue: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: '#17171A',
  },
  addedMessage: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  successIcon: {
    width: 25,
    height: 25,
    borderRadius: 7,
    backgroundColor: '#21D4B4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  successCheck: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  addedText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11,
    lineHeight: 14,
    color: '#17171A',
  },
  viewCart: {
    marginLeft: 8,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: '#21D4B4',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F5',
  },
  buyButton: {
    flex: 1,
    height: 61,
    borderWidth: 1,
    borderColor: '#E7E9F0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  buyText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: '#17171A',
  },
  addButton: {
    flex: 1,
    height: 61,
    borderRadius: 12,
    backgroundColor: '#1D1D1F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buyButtonDisabled: {
    opacity: 0.7,
  },
  addButtonDisabled: { opacity: 0.75 },
  addText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
});

export default ProductDetailsScreen;
