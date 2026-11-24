import { quickCartApi } from '../quickCartApi';
import { store } from '../../store/store';

jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(async () => false),
  setGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

describe('mobile banner API separation', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => { jest.useFakeTimers(); });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    store.dispatch(quickCartApi.util.resetApiState());
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('requests only the dedicated mobile endpoint and accepts an empty feed', async () => {
    const fetchMock = jest.fn(async (_request: Request) => new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    }));
    globalThis.fetch = fetchMock as typeof fetch;
    const query = store.dispatch(quickCartApi.endpoints.getMobileBanners.initiate());
    try {
      expect((await query.unwrap()).data).toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const request = fetchMock.mock.calls[0][0] as Request;
      expect(request.url).toMatch(/\/api\/mobile-banners$/);
      expect(request.url).not.toMatch(/\/api\/banners$/);
    } finally { query.unsubscribe(); }
  });
});
