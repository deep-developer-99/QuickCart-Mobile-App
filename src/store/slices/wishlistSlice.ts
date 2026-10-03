import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { CartProduct } from './cartSlice';

export type WishlistItem = CartProduct;

export interface WishlistState {
  items: WishlistItem[];
}

const initialState: WishlistState = {
  items: [],
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    toggleWishlist: (state, action: PayloadAction<CartProduct>) => {
      const existingIndex = state.items.findIndex(
        item => item._id === action.payload._id,
      );

      if (existingIndex >= 0) {
        state.items.splice(existingIndex, 1);
        return;
      }

      state.items.push(action.payload);
    },

    removeFromWishlist: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item._id !== action.payload);
    },

    clearWishlist: state => {
      state.items = [];
    },
  },
});

export const { toggleWishlist, removeFromWishlist, clearWishlist } =
  wishlistSlice.actions;

export default wishlistSlice.reducer;
