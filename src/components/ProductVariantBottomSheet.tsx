import React from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from './AppText';
import { type CartItem, type ProductVariant, useAddToCartMutation, useRemoveCartItemMutation, useUpdateCartItemMutation } from '../api/quickCartApi';
import { hasVariantDiscount, normalizedVariantPrice, variantDiscountPercentage, variantSellingPrice } from '../utils/variantPricing';
import { useTheme } from '../theme';

type Props = { visible: boolean; productId: string; productName: string; productImage?: string; variants: ProductVariant[]; cartItems?: CartItem[]; onClose: () => void; onAdded?: () => void };
const money = (value: number) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function ProductVariantBottomSheet({ visible, productId, productName, productImage, variants, cartItems = [], onClose, onAdded }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [add] = useAddToCartMutation();
  const [update] = useUpdateCartItemMutation();
  const [remove] = useRemoveCartItemMutation();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const pendingIdRef = React.useRef<string | null>(null);
  const screenHeight = Dimensions.get('window').height;
  const maxHeight = screenHeight * 0.82;
  const collapsedHeight = screenHeight * 0.55;
  const sheetHeight = React.useRef(new Animated.Value(collapsedHeight)).current;
  const currentHeight = React.useRef(collapsedHeight);
  const dragStartHeight = React.useRef(collapsedHeight);
  const styles = React.useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
    backdrop: StyleSheet.absoluteFill,
    list: { flex: 1 },
    sheet: { maxHeight: '82%', backgroundColor: theme.colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: Math.max(insets.bottom, 12) },
    grab: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: theme.colors.grey100, marginTop: 10, marginBottom: 12 },
    heading: { fontSize: 18, fontWeight: '700', color: theme.colors.text, paddingHorizontal: 20, paddingBottom: 14 },
    grid: { paddingHorizontal: 16, paddingBottom: 18, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: { width: '48.5%', minHeight: 190, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.grey50, borderRadius: 14, padding: 10, backgroundColor: theme.colors.surface },
    imageBox: { height: 90, borderRadius: 10, backgroundColor: theme.colors.grey50, position: 'relative', marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
    image: { width: '100%', height: '100%', borderRadius: 10 },
    add: { position: 'absolute', right: 5, bottom: -7, minWidth: 58, height: 30, borderRadius: 8, borderWidth: 1, borderColor: '#168B43', backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
    addText: { color: '#168B43', fontSize: 12, fontWeight: '700' },
    unit: { color: theme.colors.text, fontSize: 13, fontWeight: '600', marginBottom: 3 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    price: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
    original: { color: theme.colors.secondaryText, fontSize: 11, textDecorationLine: 'line-through' },
    discount: { color: '#168BCE', fontSize: 10, marginTop: 2 },
    stock: { color: '#B42318', fontSize: 11, marginTop: 4 },
    disabledCard: { opacity: 0.55 },
    disabledQuantity: { backgroundColor: '#999' },
    quantity: { position: 'absolute', right: 5, bottom: -7, height: 30, minWidth: 75, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderRadius: 8, backgroundColor: '#168B43' },
    qbutton: { color: '#fff', fontWeight: '700', fontSize: 17, paddingHorizontal: 5 },
    qvalue: { color: '#fff', fontWeight: '700', fontSize: 12 },
    close: { position: 'absolute', top: -52, left: '50%', marginLeft: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', zIndex: 3, elevation: 4 },
    closeText: { color: theme.colors.text, fontSize: 23, lineHeight: 26 },
  }), [insets.bottom, theme.colors]);
  const panResponder = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderGrant: () => { dragStartHeight.current = currentHeight.current; },
    onPanResponderMove: (_, g) => {
      const next = Math.max(collapsedHeight, Math.min(maxHeight, dragStartHeight.current - g.dy));
      currentHeight.current = next;
      sheetHeight.setValue(next);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 125 && currentHeight.current <= collapsedHeight + 10) { onClose(); return; }
      const expand = currentHeight.current > (collapsedHeight + maxHeight) / 2 || g.vy < -0.65;
      const target = expand ? maxHeight : collapsedHeight;
      currentHeight.current = target;
      Animated.spring(sheetHeight, { toValue: target, useNativeDriver: false, bounciness: 0 }).start();
    },
  }), [collapsedHeight, maxHeight, onClose, sheetHeight]);
  React.useEffect(() => { if (visible) { currentHeight.current = collapsedHeight; sheetHeight.setValue(collapsedHeight); } }, [collapsedHeight, sheetHeight, visible]);
  const updateVariant = async (variant: ProductVariant, next: number) => {
    if (pendingIdRef.current) return;
    const item = cartItems.find(row => row.product?._id === productId && row.variantId === variant._id);
    pendingIdRef.current = variant._id;
    setPendingId(variant._id);
    try {
      if (next <= 0 && item) await remove({ productId, variantId: variant._id }).unwrap();
      else if (item) await update({ productId, variantId: variant._id, quantity: Math.min(next, variant.stock) }).unwrap();
      else if (variant.stock > 0) { await add({ productId, variantId: variant._id, quantity: 1 }).unwrap(); onAdded?.(); }
    } catch (error) { console.error('Failed to update variant cart quantity:', error); }
    finally { pendingIdRef.current = null; setPendingId(null); }
  };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close variant options" />
      <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
        <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Close variant options"><Text style={styles.closeText}>×</Text></Pressable>
        <View {...panResponder.panHandlers}><View style={styles.grab} /><Text style={styles.heading} numberOfLines={2}>{productName}</Text></View>
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
          {variants.map(variant => {
            const cartItem = cartItems.find(row => row.product?._id === productId && row.variantId === variant._id);
            const quantity = cartItem?.quantity ?? 0;
            const busy = pendingId === variant._id;
            const mutationsPending = pendingId !== null;
            const discounted = hasVariantDiscount(variant);
            const normalized = normalizedVariantPrice(variant);
            return <View key={variant._id} style={[styles.card, variant.stock <= 0 && styles.disabledCard]}>
              <View style={styles.imageBox}>{productImage ? <Image source={{ uri: productImage }} style={styles.image} resizeMode="contain" /> : <Text style={{ color: theme.colors.secondaryText }}>No image</Text>}
              {quantity > 0 ? <View style={[styles.quantity, variant.stock <= 0 && styles.disabledQuantity]}><Pressable onPress={() => updateVariant(variant, quantity - 1)} disabled={mutationsPending} accessibilityLabel="Decrease quantity"><Text style={styles.qbutton}>−</Text></Pressable><Text style={styles.qvalue}>{busy ? '…' : quantity}</Text><Pressable onPress={() => updateVariant(variant, quantity + 1)} disabled={mutationsPending || quantity >= variant.stock} accessibilityLabel="Increase quantity"><Text style={styles.qbutton}>+</Text></Pressable></View> : <Pressable style={styles.add} disabled={variant.stock <= 0 || mutationsPending} onPress={() => updateVariant(variant, 1)} accessibilityRole="button" accessibilityLabel={`Add ${variant.quantity} ${variant.unit} to cart`}>{busy ? <ActivityIndicator size="small" color="#168B43" /> : <Text style={styles.addText}>{variant.stock <= 0 ? 'SOLD OUT' : 'ADD'}</Text>}</Pressable>}
              </View>
              <Text style={styles.unit}>{variant.quantity} {variant.unit}</Text>
              <View style={styles.priceRow}><Text style={styles.price}>{money(variantSellingPrice(variant))}</Text>{discounted ? <Text style={styles.original}>{money(variant.price)}</Text> : null}</View>
              {discounted ? <Text style={styles.discount}>{variantDiscountPercentage(variant)}% OFF on MRP</Text> : null}
              {normalized ? <Text style={styles.discount}>{money(normalized.price)}/{normalized.unit}</Text> : null}
              {variant.stock <= 0 ? <Text style={styles.stock}>Out of stock</Text> : null}
            </View>;
          })}
        </ScrollView>
      </Animated.View>
    </View>
  </Modal>;
}
