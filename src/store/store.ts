import { configureStore } from '@reduxjs/toolkit';
import { quickCartApi } from '../api/quickCartApi';

export const store = configureStore({
  reducer: {
    [quickCartApi.reducerPath]: quickCartApi.reducer,
  },

  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(quickCartApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
