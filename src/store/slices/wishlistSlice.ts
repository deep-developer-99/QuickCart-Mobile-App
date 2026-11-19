import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { CartProduct } from '../../api/quickCartApi';
import type { RootState } from '../store';
import { logout, setCredentials } from './authSlice';

export type WishlistItem = CartProduct;

export interface WishlistState {
  ownerId: string | null;
  items: WishlistItem[];
  confirmedItems: WishlistItem[];
  revision: number;
  productRevision: Record<string, number>;
  confirmedRevisionByProduct: Record<string, number>;
  latestOperationByProduct: Record<string, string>;
  isLoaded: boolean;
  isLoading: boolean;
}

const initialState: WishlistState = {
  ownerId: null,
  items: [],
  confirmedItems: [],
  revision: 0,
  productRevision: {},
  confirmedRevisionByProduct: {},
  latestOperationByProduct: {},
  isLoaded: false,
  isLoading: false,
};

const resetForUser = (state: WishlistState, userId: string | null) => {
  state.ownerId = userId;
  state.items = [];
  state.confirmedItems = [];
  state.revision = 0;
  state.productRevision = {};
  state.confirmedRevisionByProduct = {};
  state.latestOperationByProduct = {};
  state.isLoaded = false;
  state.isLoading = false;
};

const uniqueProducts = (products: WishlistItem[]) => {
  const unique = new Map<string, WishlistItem>();
  for (const product of products) {
    if (product?._id) unique.set(product._id, product);
  }
  return [...unique.values()];
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    wishlistRequestStarted: (state, action: PayloadAction<{ userId: string }>) => {
      if (state.ownerId === action.payload.userId) state.isLoading = true;
    },
    wishlistRequestFailed: (state, action: PayloadAction<{ userId: string }>) => {
      if (state.ownerId === action.payload.userId) state.isLoading = false;
    },
    wishlistHydrated: (
      state,
      action: PayloadAction<{
        userId: string;
        startedAtRevision: number;
        products: WishlistItem[];
      }>,
    ) => {
      const { userId, startedAtRevision, products } = action.payload;
      if (state.ownerId !== userId) return;

      const merged = new Map(uniqueProducts(products).map(item => [item._id, item]));
      const confirmed = new Map(merged);
      const currentById = new Map(state.items.map(item => [item._id, item]));
      const confirmedById = new Map(state.confirmedItems.map(item => [item._id, item]));

      for (const [productId, changedAt] of Object.entries(state.productRevision)) {
        if (changedAt <= startedAtRevision) continue;

        if ((state.confirmedRevisionByProduct[productId] ?? 0) > startedAtRevision) {
          const confirmedItem = confirmedById.get(productId);
          if (confirmedItem) {
            confirmed.set(productId, confirmedItem);
            merged.set(productId, confirmedItem);
          } else {
            confirmed.delete(productId);
            merged.delete(productId);
          }
        }

        if (state.latestOperationByProduct[productId]) {
          const optimisticItem = currentById.get(productId);
          if (optimisticItem) merged.set(productId, optimisticItem);
          else merged.delete(productId);
        }
      }

      state.items = [...merged.values()];
      state.confirmedItems = [...confirmed.values()];
      state.isLoaded = true;
      state.isLoading = false;
    },
    wishlistOptimisticSet: (
      state,
      action: PayloadAction<{
        userId: string;
        productId: string;
        product?: WishlistItem;
        isWishlisted: boolean;
        operationId: string;
      }>,
    ) => {
      const { userId, productId, product, isWishlisted, operationId } = action.payload;
      if (state.ownerId !== userId || !productId) return;
      state.revision += 1;
      state.productRevision[productId] = state.revision;
      state.latestOperationByProduct[productId] = operationId;
      if (isWishlisted) {
        const item = product ?? state.items.find(existing => existing._id === productId);
        if (item && !state.items.some(existing => existing._id === productId)) state.items.push(item);
      } else {
        state.items = state.items.filter(item => item._id !== productId);
      }
    },
    wishlistOperationSettled: (
      state,
      action: PayloadAction<{
        userId: string;
        productId: string;
        operationId: string;
        isWishlisted: boolean;
        product?: WishlistItem;
      }>,
    ) => {
      const { userId, productId, operationId, isWishlisted, product } = action.payload;
      if (state.ownerId !== userId) return;
      state.revision += 1;
      state.productRevision[productId] = state.revision;
      state.confirmedRevisionByProduct[productId] = state.revision;
      if (isWishlisted) {
        const item = product ?? state.confirmedItems.find(existing => existing._id === productId);
        if (item && !state.confirmedItems.some(existing => existing._id === productId)) {
          state.confirmedItems.push(item);
        }
      } else {
        state.confirmedItems = state.confirmedItems.filter(item => item._id !== productId);
      }
      if (state.latestOperationByProduct[productId] === operationId) {
        delete state.latestOperationByProduct[productId];
      }
    },
    wishlistOperationRolledBack: (
      state,
      action: PayloadAction<{
        userId: string;
        productId: string;
        operationId: string;
      }>,
    ) => {
      const { userId, productId, operationId } = action.payload;
      if (state.ownerId !== userId || state.latestOperationByProduct[productId] !== operationId) return;
      state.revision += 1;
      state.productRevision[productId] = state.revision;
      delete state.latestOperationByProduct[productId];
      const confirmedItem = state.confirmedItems.find(item => item._id === productId);
      if (confirmedItem) {
        if (!state.items.some(item => item._id === productId)) state.items.push(confirmedItem);
      } else {
        state.items = state.items.filter(item => item._id !== productId);
      }
    },
    wishlistClearOptimistic: (
      state,
      action: PayloadAction<{ userId: string; operationId: string }>,
    ) => {
      if (state.ownerId !== action.payload.userId) return;
      state.revision += 1;
      for (const product of state.items) {
        state.productRevision[product._id] = state.revision;
        state.latestOperationByProduct[product._id] = action.payload.operationId;
      }
      state.items = [];
    },
    wishlistClearRolledBack: (
      state,
      action: PayloadAction<{ userId: string; operationId: string; previousItems: WishlistItem[] }>,
    ) => {
      if (state.ownerId !== action.payload.userId) return;
      const restore = action.payload.previousItems.filter(
        item => state.latestOperationByProduct[item._id] === action.payload.operationId,
      );
      if (restore.length === 0) return;
      state.revision += 1;
      for (const item of restore) {
        state.productRevision[item._id] = state.revision;
        delete state.latestOperationByProduct[item._id];
        const confirmedItem = state.confirmedItems.find(existing => existing._id === item._id);
        if (confirmedItem && !state.items.some(existing => existing._id === item._id)) {
          state.items.push(confirmedItem);
        }
      }
    },
    wishlistClearSettled: (
      state,
      action: PayloadAction<{ userId: string; operationId: string }>,
    ) => {
      if (state.ownerId !== action.payload.userId) return;
      state.revision += 1;
      const clearedIds: string[] = [];
      for (const [productId, operationId] of Object.entries(state.latestOperationByProduct)) {
        if (operationId !== action.payload.operationId) continue;
        clearedIds.push(productId);
        state.productRevision[productId] = state.revision;
        state.confirmedRevisionByProduct[productId] = state.revision;
        delete state.latestOperationByProduct[productId];
      }
      state.confirmedItems = state.confirmedItems.filter(item => !clearedIds.includes(item._id));
    },
  },
  extraReducers: builder => {
    builder
      .addCase(setCredentials, (state, action) => {
        if (state.ownerId !== action.payload.user.id) resetForUser(state, action.payload.user.id);
      })
      .addCase(logout, state => resetForUser(state, null));
  },
});

export const {
  wishlistRequestStarted,
  wishlistRequestFailed,
  wishlistHydrated,
  wishlistOptimisticSet,
  wishlistOperationSettled,
  wishlistOperationRolledBack,
  wishlistClearOptimistic,
  wishlistClearRolledBack,
  wishlistClearSettled,
} = wishlistSlice.actions;

const selectWishlistItemsValue = (state: RootState) => state.wishlist.items;
export const selectWishlistItems = createSelector([selectWishlistItemsValue], items => items);
export const selectWishlistIds = createSelector(
  [selectWishlistItemsValue],
  items => new Set(items.map(item => item._id)),
);
export const selectHasWishlistItems = createSelector(
  [selectWishlistItemsValue],
  items => items.length > 0,
);

export default wishlistSlice.reducer;
