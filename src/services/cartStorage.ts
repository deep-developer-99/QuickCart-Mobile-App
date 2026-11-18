import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartItem } from '../api/quickCartApi';

const CART_VERSION = 1;
export const cartStorageKey = (userId: string) => `quickcart:cart:v${CART_VERSION}:${userId}`;

export const readLocalCart = async (userId: string): Promise<CartItem[]> => {
  const raw = await AsyncStorage.getItem(cartStorageKey(userId));
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as { version?: number; userId?: string; items?: CartItem[] };
    if (value.version !== CART_VERSION || value.userId !== userId || !Array.isArray(value.items)) return [];
    return value.items;
  } catch {
    return [];
  }
};

export const writeLocalCart = async (userId: string, items: CartItem[]) => {
  await AsyncStorage.setItem(cartStorageKey(userId), JSON.stringify({ version: CART_VERSION, userId, items }));
};
