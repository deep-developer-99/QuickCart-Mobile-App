import { configureStore } from '@reduxjs/toolkit';
import type { Middleware } from '@reduxjs/toolkit';

import { quickCartApi } from '../api/quickCartApi';
import authReducer, { logout, setCredentials } from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';
import type { CartState } from './slices/cartSlice';
import { writeLocalCart } from '../services/cartStorage';

const CART_PERSIST_DEBOUNCE_MS = 300;
let cartWriteQueue: Promise<void> = Promise.resolve();
const pendingCartWrites = new Map<string, { items: CartState['items']; timer: ReturnType<typeof setTimeout> }>();
const enqueueCartWrite = (userId: string, items: CartState['items']) => {
  cartWriteQueue = cartWriteQueue.then(() => writeLocalCart(userId, items)).catch(error => {
    console.warn('Unable to persist the local cart:', error);
  });
};
export const flushCartPersistence = (userId?: string) => {
  for (const [owner, pending] of pendingCartWrites) {
    if (userId && owner !== userId) continue;
    clearTimeout(pending.timer);
    pendingCartWrites.delete(owner);
    enqueueCartWrite(owner, pending.items);
  }
  return cartWriteQueue;
};
const cartPersistenceMiddleware: Middleware = api => next => action => {
  const before = api.getState() as { auth: { user: { id: string } | null }; cart: CartState };
  if ((logout.match(action) || setCredentials.match(action) && before.auth.user?.id !== action.payload.user.id) && before.auth.user?.id) {
    flushCartPersistence(before.auth.user.id);
  }
  const result = next(action);
  const type = typeof action === 'object' && action !== null && 'type' in action
    ? String(action.type)
    : '';
  if (type === 'cart/addCartLine' || type === 'cart/incrementCartLine' || type === 'cart/decrementCartLine' || type === 'cart/setCartLineQuantity' || type === 'cart/removeCartLine' || type === 'cart/clearUserCart' || type === 'cart/removePurchasedCartLines') {
    const state = api.getState() as { auth: { user: { id: string } | null }; cart: CartState };
    const userId = state.auth.user?.id;
    if (userId && state.cart.ownerId === userId && state.cart.hydratedForUserId === userId) {
      const previous = pendingCartWrites.get(userId);
      if (previous) clearTimeout(previous.timer);
      const items = state.cart.items;
      const immediate = type === 'cart/clearUserCart' || type === 'cart/removePurchasedCartLines';
      if (immediate) {
        pendingCartWrites.delete(userId);
        enqueueCartWrite(userId, items);
      } else {
        const timer = setTimeout(() => flushCartPersistence(userId), CART_PERSIST_DEBOUNCE_MS);
        pendingCartWrites.set(userId, { items, timer });
      }
    }
  }
  return result;
};

const clearUserApiCacheMiddleware: Middleware = api => next => action => {
  const previousUserId = (api.getState() as { auth: { user: { id: string } | null } }).auth.user?.id;
  const result = next(action);
  const nextUserId = (api.getState() as { auth: { user: { id: string } | null } }).auth.user?.id;
  const accountChanged =
    (setCredentials.match(action) && previousUserId !== nextUserId) ||
    (logout.match(action) && previousUserId !== null);

  if (accountChanged) api.dispatch(quickCartApi.util.resetApiState());
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
    getDefaultMiddleware().concat(
      cartPersistenceMiddleware,
      clearUserApiCacheMiddleware,
      quickCartApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
