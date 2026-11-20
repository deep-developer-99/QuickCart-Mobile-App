jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartStorageKey, deactivateLocalCart, readLocalCart, writeLocalCart } from '../src/services/cartStorage';

test('deactivation follows an in-flight write and rejects delayed old-account writes', async () => {
  let finishWrite: () => void = () => {};
  (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(() => new Promise<void>(resolve => { finishWrite = resolve; }));
  const pending = writeLocalCart('old-account', []);
  await Promise.resolve();
  await Promise.resolve();
  const cleanup = deactivateLocalCart('old-account');
  finishWrite();
  await pending;
  await cleanup;
  await writeLocalCart('old-account', []);
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith(cartStorageKey('old-account'));
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  await writeLocalCart('new-account', []);
  expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(cartStorageKey('new-account'), expect.any(String));
});

test('new-account hydration ignores a payload belonging to the historical account', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ version: 1, userId: 'old-account', items: [{ product: 'private-product' }] }));
  expect(await readLocalCart('new-account')).toEqual([]);
});
