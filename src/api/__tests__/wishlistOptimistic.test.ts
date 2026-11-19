import { quickCartApi } from '../quickCartApi';
import type { CartProduct } from '../quickCartApi';
import { logout, setCredentials } from '../../store/slices/authSlice';
import { store } from '../../store/store';

jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(async () => ({ username: 'quickcart', password: 'test-token' })),
  setGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

const product: CartProduct = { _id: 'milk', name: 'Milk' };
const bread: CartProduct = { _id: 'bread', name: 'Bread' };
const requestHandles: Array<{ reset?: () => void; unsubscribe?: () => void }> = [];

const trackRequest = <T extends { reset?: () => void; unsubscribe?: () => void }>(request: T): T => {
  requestHandles.push(request);
  return request;
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const response = (data: unknown) => new Response(JSON.stringify(data), {
  status: 200,
  headers: { 'content-type': 'application/json' },
});

const waitForFetchCalls = async (fetchMock: jest.Mock, callCount: number) => {
  for (let attempt = 0; attempt < 100 && fetchMock.mock.calls.length < callCount; attempt += 1) {
    await Promise.resolve();
  }
  expect(fetchMock).toHaveBeenCalledTimes(callCount);
};

const authenticate = () => {
  store.dispatch(logout());
  store.dispatch(setCredentials({
    user: { id: 'user-a', name: 'Customer', email: 'customer@example.test', role: 'user' },
    token: 'test-token',
  }));
};

describe('RTK Query wishlist optimistic mutations', () => {
  const originalFetch = globalThis.fetch;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

  beforeEach(() => {
    jest.useFakeTimers();
    globalThis.requestAnimationFrame = callback => {
      callback(0);
      return 0;
    };
    authenticate();
  });

  afterEach(() => {
    requestHandles.splice(0).forEach(request => {
      request.unsubscribe?.();
      request.reset?.();
    });
    store.dispatch(quickCartApi.util.resetApiState());
    globalThis.fetch = originalFetch;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    store.dispatch(logout());
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('updates the Redux wishlist before a delayed add request resolves', async () => {
    const request = deferred<Response>();
    globalThis.fetch = jest.fn(() => request.promise) as typeof fetch;
    const mutation = trackRequest(store.dispatch(quickCartApi.endpoints.addToWishlist.initiate({
      productId: product._id, product, userId: 'user-a',
    })));

    expect(store.getState().wishlist.items).toEqual([product]);
    request.resolve(response({ success: true, message: 'Added' }));
    await mutation.unwrap();
    expect(store.getState().wishlist.confirmedItems).toEqual([product]);
  });

  it('rolls back an add after a rejected network request', async () => {
    globalThis.fetch = jest.fn(() => Promise.reject(new TypeError('Network unavailable'))) as typeof fetch;
    const mutation = trackRequest(store.dispatch(quickCartApi.endpoints.addToWishlist.initiate({
      productId: product._id, product, userId: 'user-a',
    })));

    expect(store.getState().wishlist.items).toEqual([product]);
    await expect(mutation.unwrap()).rejects.toBeTruthy();
    expect(store.getState().wishlist.items).toEqual([]);
  });

  it('removes immediately and restores the confirmed product after a failed delete', async () => {
    const getRequest = deferred<Response>();
    const deleteRequest = deferred<Response>();
    globalThis.fetch = jest.fn()
      .mockReturnValueOnce(getRequest.promise)
      .mockReturnValueOnce(deleteRequest.promise) as typeof fetch;
    const get = trackRequest(store.dispatch(quickCartApi.endpoints.getWishlist.initiate(undefined, { forceRefetch: true })));
    getRequest.resolve(response({ success: true, data: [product] }));
    await get.unwrap();

    const mutation = trackRequest(store.dispatch(quickCartApi.endpoints.removeFromWishlist.initiate({
      productId: product._id, userId: 'user-a',
    })));
    expect(store.getState().wishlist.items).toEqual([]);
    deleteRequest.reject(new TypeError('Network unavailable'));
    await expect(mutation.unwrap()).rejects.toBeTruthy();
    expect(store.getState().wishlist.items).toEqual([product]);
  });

  it('keeps an optimistic addition when a slower initial GET resolves afterward', async () => {
    const getRequest = deferred<Response>();
    const addRequest = deferred<Response>();
    globalThis.fetch = jest.fn()
      .mockReturnValueOnce(getRequest.promise)
      .mockReturnValueOnce(addRequest.promise) as typeof fetch;

    const get = trackRequest(store.dispatch(quickCartApi.endpoints.getWishlist.initiate(undefined, { forceRefetch: true })));
    const add = trackRequest(store.dispatch(quickCartApi.endpoints.addToWishlist.initiate({
      productId: product._id, product, userId: 'user-a',
    })));
    expect(store.getState().wishlist.items).toEqual([product]);

    getRequest.resolve(response({ success: true, data: [bread] }));
    addRequest.resolve(response({ success: true, message: 'Added' }));
    await Promise.all([get.unwrap(), add.unwrap()]);
    expect(store.getState().wishlist.items).toEqual([bread, product]);
  });

  it('serializes rapid opposite mutations for one product without blocking another product', async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    const unrelated = deferred<Response>();
    const fetchMock = jest.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(unrelated.promise);
    globalThis.fetch = fetchMock as typeof fetch;

    const add = trackRequest(store.dispatch(quickCartApi.endpoints.addToWishlist.initiate({
      productId: product._id, product, userId: 'user-a',
    })));
    const remove = trackRequest(store.dispatch(quickCartApi.endpoints.removeFromWishlist.initiate({
      productId: product._id, userId: 'user-a',
    })));
    const addBread = trackRequest(store.dispatch(quickCartApi.endpoints.addToWishlist.initiate({
      productId: bread._id, product: bread, userId: 'user-a',
    })));

    expect(store.getState().wishlist.items).toEqual([bread]);
    await waitForFetchCalls(fetchMock, 2);
    first.resolve(response({ success: true, message: 'Added' }));
    unrelated.resolve(response({ success: true, message: 'Added' }));
    await waitForFetchCalls(fetchMock, 3);
    second.resolve(response({ success: true, message: 'Removed' }));
    await Promise.all([add.unwrap(), remove.unwrap(), addBread.unwrap()]);
    expect(store.getState().wishlist.items).toEqual([bread]);
  });

  it('does not restore prior-account data when logout occurs during a pending request', async () => {
    const request = deferred<Response>();
    globalThis.fetch = jest.fn(() => request.promise) as typeof fetch;
    const get = trackRequest(store.dispatch(quickCartApi.endpoints.getWishlist.initiate(undefined, { forceRefetch: true })));
    store.dispatch(logout());
    request.resolve(response({ success: true, data: [product] }));
    await get.unwrap().catch(() => undefined);
    expect(store.getState().wishlist.items).toEqual([]);
    expect(store.getState().wishlist.ownerId).toBeNull();
  });

  it('clears authenticated wishlist state when the server rejects an expired token', async () => {
    globalThis.fetch = jest.fn(() => Promise.resolve(new Response(
      JSON.stringify({ success: false, message: 'Unauthorized' }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    ))) as typeof fetch;
    const get = trackRequest(store.dispatch(quickCartApi.endpoints.getWishlist.initiate(undefined, { forceRefetch: true })));

    await get.unwrap().catch(() => undefined);
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().wishlist.items).toEqual([]);
  });
});

