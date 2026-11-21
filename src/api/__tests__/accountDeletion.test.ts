import AsyncStorage from "@react-native-async-storage/async-storage";
import { cartStorageKey } from "../../services/cartStorage";
import { quickCartApi } from '../quickCartApi';
import { logout, setCredentials } from '../../store/slices/authSlice';
import { store } from '../../store/store';

jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(async () => ({ username: 'quickcart', password: 'test-token' })),
  resetGenericPassword: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { removeItem: jest.fn(async () => {}) },
}));

const originalFetch = globalThis.fetch;

beforeEach(() => {
  store.dispatch(setCredentials({
    user: { id: 'deletion-test-user', name: 'Customer', email: 'customer@example.test', role: 'user' },
    token: 'test-token',
  }));
});

afterEach(() => {
  store.dispatch(logout());
  store.dispatch(quickCartApi.util.resetApiState());
  globalThis.fetch = originalFetch;
});

const jsonResponse = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json' },
});

const payload = {
  reason: 'Other',
  feedback: 'Optional',
  confirmationToken: 'test-confirmation',
};

it('uses the bearer confirmation and deletion endpoints with the selected reason', async () => {
  const fetchMock = jest.fn()
    .mockResolvedValueOnce(jsonResponse({ success: true, confirmationToken: payload.confirmationToken }))
    .mockResolvedValueOnce(jsonResponse({ success: true }));
  globalThis.fetch = fetchMock;

  const context = await store.dispatch(quickCartApi.endpoints.getDeletionConfirmation.initiate()).unwrap();
  await expect(store.dispatch(quickCartApi.endpoints.deleteAccount.initiate({
    ...payload, confirmationToken: context.confirmationToken,
  })).unwrap()).resolves.toEqual({ success: true });

  const [confirmation, deletion] = fetchMock.mock.calls.map(([request]) => request as Request);
  expect(new URL(confirmation.url).pathname).toBe('/api/auth/delete-account/confirmation');
  expect(new URL(deletion.url).pathname).toBe('/api/auth/delete-account');
  for (const request of [confirmation, deletion]) {
    expect(request.method).toBe('POST');
    expect(request.headers.get('authorization')).toBe('Bearer test-token');
  }
  await expect(deletion.json()).resolves.toEqual(payload);
});

it.each([
  [409, 'PAYMENT_PENDING'],
  [503, 'MIGRATION_REQUIRED'],
])('returns deletion blockers without signing out (%s %s)', async (status, code) => {
  globalThis.fetch = jest.fn().mockResolvedValue(jsonResponse({ success: false, code }, status));
  await expect(store.dispatch(quickCartApi.endpoints.deleteAccount.initiate(payload)).unwrap()).rejects.toMatchObject({
    status, data: { code },
  });
  expect(store.getState().auth.user?.id).toBe('deletion-test-user');
});

it('clears the expired session when deletion returns ACCOUNT_INACTIVE', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue(jsonResponse({ success: false, code: 'ACCOUNT_INACTIVE' }, 401));
  const mutation = store.dispatch(quickCartApi.endpoints.deleteAccount.initiate(payload));
  // Logout clears the user-scoped RTK cache, including this pending mutation.
  await expect(mutation.unwrap()).rejects.toBeDefined();
  expect(store.getState().auth.user).toBeNull();
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith(cartStorageKey("deletion-test-user"));
});
