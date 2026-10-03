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

interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

const getSellingPrice = (product: CartProduct) =>
  product.discountPrice !== undefined && product.discountPrice < product.price
    ? product.discountPrice
    : product.price;

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartProduct>) => {
      const existing = state.items.find(
        item => item._id === action.payload._id,
      );

      if (existing) {
        if (existing.quantity < existing.stock) {
          existing.quantity += 1;
        }
        return;
      }

      state.items.push({ ...action.payload, quantity: 1 });
    },
    incrementCartItem: (state, action: PayloadAction<string>) => {
      const item = state.items.find(item => item._id === action.payload);
      if (item && item.quantity < item.stock) {
        item.quantity += 1;
      }
    },
    decrementCartItem: (state, action: PayloadAction<string>) => {
      const item = state.items.find(item => item._id === action.payload);
      if (!item) return;

      if (item.quantity > 1) {
        item.quantity -= 1;
      } else {
        state.items = state.items.filter(item => item._id !== action.payload);
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

export const selectCartCount = (state: CartState) =>
  state.items.reduce((total, item) => total + item.quantity, 0);

export const selectCartTotal = (state: CartState) =>
  state.items.reduce(
    (total, item) => total + getSellingPrice(item) * item.quantity,
    0,
  );

export default cartSlice.reducer;
