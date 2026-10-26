import { resolveLocation } from '../locationService';
import { getToken } from '../secureStorage';

jest.mock('../secureStorage', () => ({
  getToken: jest.fn(),
}));

jest.mock('react-native-geolocation-service', () => ({
  __esModule: true,
  default: {},
}));

describe('resolveLocation', () => {
  const fetchMock = jest.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (getToken as jest.Mock).mockResolvedValue('user-token');
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('uses the existing authenticated reverse-geocoding endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          display_name: '1 Main Road, Pune',
          address: {
            house_number: '1',
            road: 'Main Road',
            city: 'Pune',
            state: 'Maharashtra',
            postcode: '411001',
          },
        },
      }),
    });

    const result = await resolveLocation(18.5204, 73.8567);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/location/reverse?lat=18.5204&lon=73.8567');
    expect(fetchMock.mock.calls[0][0]).not.toContain('/location/resolve');
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: 'Bearer user-token',
    });
    expect(result.address).toMatchObject({
      addressLine: '1, Main Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
    });
  });
});
