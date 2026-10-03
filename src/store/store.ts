import { configureStore } from '@reduxjs/toolkit';

import { quickCartApi } from '../api/quickCartApi';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    [quickCartApi.reducerPath]: quickCartApi.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(quickCartApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
