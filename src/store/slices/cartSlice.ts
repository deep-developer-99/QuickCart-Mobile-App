import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CartItem, CartProduct } from '../../api/quickCartApi';
import { logout, setCredentials } from './authSlice';
export type { CartProduct } from '../../api/quickCartApi';

const MAX_QUANTITY = 99;
export interface CartState {
  ownerId: string | null;
  hydratedForUserId: string | null;
  items: CartItem[];
}

const initialState: CartState = { ownerId: null, hydratedForUserId: null, items: [] };
const lineKey = (item: CartItem) => `${item.product?._id ?? ''}:${item.variantId ?? ''}`;
const selectedStock = (item: CartItem) => item.product?.variants?.find(variant => variant._id === item.variantId && variant.isActive)?.stock ?? 0;

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    beginCartHydration: (state, action: PayloadAction<string>) => {
      state.ownerId = action.payload;
      state.hydratedForUserId = null;
      state.items = [];
    },
    hydrateCart: (state, action: PayloadAction<{ userId: string; items: CartItem[] }>) => {
      if (state.ownerId !== action.payload.userId) return;
      const unique = new Map<string, CartItem>();
      for (const item of action.payload.items) {
        if (!item || typeof item !== 'object' || !item.product || typeof item.product !== 'object') continue;
        const variant = item.product.variants?.find(entry => entry._id === item.variantId);
        if (!item.product?._id || !item.variantId || !variant || !Number.isInteger(item.quantity) || item.quantity < 1) continue;
        const key = lineKey(item);
        const previous = unique.get(key);
        const stockLimit = variant.isActive && variant.stock > 0 ? variant.stock : MAX_QUANTITY;
        unique.set(key, { ...item, quantity: Math.min(MAX_QUANTITY, stockLimit, (previous?.quantity ?? 0) + item.quantity) });
      }
      state.items = [...unique.values()];
      state.hydratedForUserId = action.payload.userId;
    },
    addCartLine: (state, action: PayloadAction<{ userId: string; product: CartProduct; variantId: string; quantity?: number }>) => {
      if (state.ownerId !== action.payload.userId || state.hydratedForUserId !== action.payload.userId) return;
      const variant = action.payload.product.variants?.find(item => item._id === action.payload.variantId && item.isActive);
      if (!variant || variant.stock <= 0) return;
      const amount = action.payload.quantity ?? 1;
      if (!Number.isInteger(amount) || amount < 1) return;
      const key = `${action.payload.product._id}:${action.payload.variantId}`;
      const existing = state.items.find(item => lineKey(item) === key);
      const quantity = Math.min(MAX_QUANTITY, variant.stock, (existing?.quantity ?? 0) + amount);
      const next: CartItem = { product: action.payload.product, variantId: action.payload.variantId, quantity };
      state.items = existing ? state.items.map(item => lineKey(item) === key ? next : item) : [...state.items, next];
    },
    incrementCartLine: (state, action: PayloadAction<{ userId: string; productId: string; variantId: string }>) => {
      if (state.ownerId !== action.payload.userId || state.hydratedForUserId !== action.payload.userId) return;
      const item = state.items.find(entry => lineKey(entry) === `${action.payload.productId}:${action.payload.variantId}`);
      if (!item) return;
      const stock = selectedStock(item);
      if (stock <= 0 || item.quantity >= Math.min(MAX_QUANTITY, stock)) return;
      item.quantity += 1;
    },
    decrementCartLine: (state, action: PayloadAction<{ userId: string; productId: string; variantId: string }>) => {
      if (state.ownerId !== action.payload.userId || state.hydratedForUserId !== action.payload.userId) return;
      const key = `${action.payload.productId}:${action.payload.variantId}`;
      const item = state.items.find(entry => lineKey(entry) === key);
      if (!item) return;
      if (item.quantity <= 1) state.items = state.items.filter(entry => lineKey(entry) !== key);
      else item.quantity -= 1;
    },
    setCartLineQuantity: (state, action: PayloadAction<{ userId: string; productId: string; variantId?: string; quantity: number }>) => {
      if (state.ownerId !== action.payload.userId || state.hydratedForUserId !== action.payload.userId) return;
      if (!Number.isInteger(action.payload.quantity)) return;
      const key = `${action.payload.productId}:${action.payload.variantId ?? ''}`;
      if (action.payload.quantity <= 0) {
        state.items = state.items.filter(item => lineKey(item) !== key);
        return;
      }
      state.items = state.items.map(item => {
        if (lineKey(item) !== key) return item;
        const stock = selectedStock(item);
        if (stock <= 0 && action.payload.quantity > item.quantity) return item;
        return { ...item, quantity: Math.max(1, Math.min(MAX_QUANTITY, stock || MAX_QUANTITY, Math.floor(action.payload.quantity))) };
      });
    },
    removeCartLine: (state, action: PayloadAction<{ userId: string; productId: string; variantId?: string }>) => {
      if (state.ownerId !== action.payload.userId || state.hydratedForUserId !== action.payload.userId) return;
      const key = `${action.payload.productId}:${action.payload.variantId ?? ''}`;
      state.items = state.items.filter(item => lineKey(item) !== key);
    },
    clearUserCart: (state, action: PayloadAction<string>) => {
      if (state.ownerId === action.payload) state.items = [];
    },
    removePurchasedCartLines: (state, action: PayloadAction<{ userId: string; items: Array<{ productId: string; variantId: string; quantity: number }> }>) => {
      if (state.ownerId !== action.payload.userId) return;
      for (const purchased of action.payload.items) {
        const item = state.items.find(entry => lineKey(entry) === `${purchased.productId}:${purchased.variantId}`);
        if (!item) continue;
        item.quantity -= purchased.quantity;
        if (item.quantity <= 0) state.items = state.items.filter(entry => lineKey(entry) !== `${purchased.productId}:${purchased.variantId}`);
      }
    },
  },
  extraReducers: builder => {
    builder
      .addCase(setCredentials, (state, action) => {
        if (state.ownerId !== action.payload.user.id) {
          state.ownerId = action.payload.user.id;
          state.hydratedForUserId = null;
          state.items = [];
        }
      })
      .addCase(logout, () => initialState);
  },
});

export const { beginCartHydration, hydrateCart, addCartLine, incrementCartLine, decrementCartLine, setCartLineQuantity, removeCartLine, clearUserCart, removePurchasedCartLines } = cartSlice.actions;
export default cartSlice.reducer;
