import { useCallback } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import { useDispatch, useStore } from 'react-redux';

import {
  quickCartApi,
  type CartProduct,
} from '../api/quickCartApi';
import { selectWishlistIds } from '../store/slices/wishlistSlice';
import type { AppDispatch, RootState } from '../store/store';

const showWishlistError = () => {
  const message = 'Could not update your wishlist. Please try again.';
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert('Wishlist update failed', message);
};

export const useWishlistActions = () => {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();

  const setWishlisted = useCallback((product: CartProduct, isWishlisted: boolean): Promise<boolean> => {
    const userId = store.getState().auth.user?.id;
    if (!userId) return Promise.resolve(false);
    const request = isWishlisted
      ? dispatch(quickCartApi.endpoints.addToWishlist.initiate({ productId: product._id, product, userId }))
      : dispatch(quickCartApi.endpoints.removeFromWishlist.initiate({ productId: product._id, userId }));
    return request.unwrap().then(() => true).catch(error => {
      if (store.getState().auth.user?.id !== userId) return false;
      console.warn('Wishlist update failed:', error);
      showWishlistError();
      return false;
    });
  }, [dispatch, store]);

  const toggleWishlist = useCallback((product: CartProduct) => {
    const isWishlisted = selectWishlistIds(store.getState()).has(product._id);
    setWishlisted(product, !isWishlisted);
  }, [setWishlisted, store]);

  return { toggleWishlist, setWishlisted };
};
