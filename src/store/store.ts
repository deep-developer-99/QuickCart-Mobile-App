import { configureStore } from '@reduxjs/toolkit';
import type { Middleware } from '@reduxjs/toolkit';

import { quickCartApi } from '../api/quickCartApi';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';
import type { CartState } from './slices/cartSlice';
import { writeLocalCart } from '../services/cartStorage';

let cartWriteQueue: Promise<void> = Promise.resolve();
const cartPersistenceMiddleware: Middleware = api => next => action => {
  const result = next(action);
  const type = typeof action === 'object' && action !== null && 'type' in action
    ? String(action.type)
    : '';
  if (type === 'cart/addCartLine' || type === 'cart/setCartLineQuantity' || type === 'cart/removeCartLine' || type === 'cart/clearUserCart' || type === 'cart/removePurchasedCartLines') {
    const state = api.getState() as { auth: { user: { id: string } | null }; cart: CartState };
    const userId = state.auth.user?.id;
    if (userId && state.cart.ownerId === userId && state.cart.hydratedForUserId === userId) {
      const items = state.cart.items;
      cartWriteQueue = cartWriteQueue
        .then(() => writeLocalCart(userId, items))
        .catch(error => console.warn('Unable to persist the local cart:', error));
    }
  }
  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    [quickCartApi.reducerPath]: quickCartApi.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(cartPersistenceMiddleware, quickCartApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
