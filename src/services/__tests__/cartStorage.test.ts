const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
  },
}));

import { cartStorageKey, readLocalCart, writeLocalCart } from '../cartStorage';
import type { CartItem } from '../../api/quickCartApi';

const items: CartItem[] = [
  {
    product: {
      _id: 'product-a',
      name: 'Milk',
      image: 'https://example.test/milk.jpg',
      variants: [{ _id: 'variant-1l', quantity: 1, unit: 'L', price: 80, stock: 4, isActive: true }],
    },
    variantId: 'variant-1l',
    quantity: 2,
  },
];

describe('versioned local cart storage', () => {
  beforeEach(() => mockStorage.clear());

  it('persists and restores the account-scoped product and variant snapshot', async () => {
    await writeLocalCart('user-a', items);

    expect(mockStorage.get(cartStorageKey('user-a'))).toEqual(JSON.stringify({
      version: 1,
      userId: 'user-a',
      items,
    }));
    await expect(readLocalCart('user-a')).resolves.toEqual(items);
  });

  it('ignores data written for another account, an unsupported version, or malformed JSON', async () => {
    mockStorage.set(cartStorageKey('user-a'), JSON.stringify({ version: 1, userId: 'user-b', items }));
    await expect(readLocalCart('user-a')).resolves.toEqual([]);

    mockStorage.set(cartStorageKey('user-a'), JSON.stringify({ version: 2, userId: 'user-a', items }));
    await expect(readLocalCart('user-a')).resolves.toEqual([]);

    mockStorage.set(cartStorageKey('user-a'), '{not-json');
    await expect(readLocalCart('user-a')).resolves.toEqual([]);
  });
});
