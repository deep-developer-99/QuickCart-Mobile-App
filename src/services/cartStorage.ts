import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartItem } from '../api/quickCartApi';

const CART_VERSION = 1;
export const cartStorageKey = (userId: string) => `quickcart:cart:v${CART_VERSION}:${userId}`;
const deactivated = new Set<string>();
const writes = new Map<string, Promise<void>>();

const queueWrite = (userId: string, operation: () => Promise<void>) => {
  const next = (writes.get(userId) ?? Promise.resolve()).catch(() => {}).then(operation);
  writes.set(userId, next);
  void next.finally(() => { if (writes.get(userId) === next) writes.delete(userId); }).catch(() => {});
  return next;
};

export const readLocalCart = async (userId: string): Promise<CartItem[]> => {
  if (deactivated.has(userId)) return [];
  const raw = await AsyncStorage.getItem(cartStorageKey(userId));
  if (!raw || deactivated.has(userId)) return [];
  try {
    const value = JSON.parse(raw) as { version?: number; userId?: string; items?: CartItem[] };
    if (value.version !== CART_VERSION || value.userId !== userId || !Array.isArray(value.items)) return [];
    return value.items;
  } catch { return []; }
};

export const writeLocalCart = (userId: string, items: CartItem[]) =>
  queueWrite(userId, async () => {
    if (deactivated.has(userId)) return;
    await AsyncStorage.setItem(cartStorageKey(userId), JSON.stringify({ version: CART_VERSION, userId, items }));
  });

export const deactivateLocalCart = (userId: string) => {
  deactivated.add(userId);
  return queueWrite(userId, () => AsyncStorage.removeItem(cartStorageKey(userId)));
};
