import { configureStore } from '@reduxjs/toolkit';
import { quickCartApi } from '../api/quickCartApi';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [quickCartApi.reducerPath]: quickCartApi.reducer,
  },

  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(quickCartApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
