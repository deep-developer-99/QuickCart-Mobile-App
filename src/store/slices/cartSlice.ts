import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartProduct {
  _id: string;
  name: string;
  image?: string;
  price: number;
  discountPrice?: number;
  stock: number;
}

export interface CartItem extends CartProduct {
  quantity: number;
}

export interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartProduct>) => {
      const existingItem = state.items.find(
        item => item._id === action.payload._id,
      );

      if (existingItem) {
        if (existingItem.quantity < existingItem.stock) {
          existingItem.quantity += 1;
        }
        return;
      }

      state.items.push({
        ...action.payload,
        quantity: 1,
      });
    },

    incrementCartItem: (state, action: PayloadAction<string>) => {
      const item = state.items.find(item => item._id === action.payload);

      if (item && item.quantity < item.stock) {
        item.quantity += 1;
      }
    },

    decrementCartItem: (state, action: PayloadAction<string>) => {
      const item = state.items.find(item => item._id === action.payload);

      if (!item) {
        return;
      }

      if (item.quantity > 1) {
        item.quantity -= 1;
      } else {
        state.items = state.items.filter(
          cartItem => cartItem._id !== action.payload,
        );
      }
    },

    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item._id !== action.payload);
    },

    clearCart: state => {
      state.items = [];
    },
  },
});

export const {
  addToCart,
  incrementCartItem,
  decrementCartItem,
  removeFromCart,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
