import {
  formatApiDiagnostic,
  getApiErrorDiagnostics,
  getSafeAuthErrorDetails,
  safeApiPath,
} from '../apiDiagnostics';

describe('API diagnostics', () => {
  it('omits query values from logged request paths', () => {
    expect(safeApiPath('/products?search=private-value&token=secret')).toBe(
      '/products',
    );
    expect(safeApiPath('')).toBe('/');
  });

  it('distinguishes HTTP statuses from common network failures without raw text', () => {
    expect(getApiErrorDiagnostics({ status: 401 })).toEqual({
      httpStatus: 401,
      errorCategory: 'http_error',
    });
    expect(
      getApiErrorDiagnostics({
        status: 'FETCH_ERROR',
        error: 'Network request failed https://private.example/?token=secret',
      }),
    ).toEqual({
      errorCategory: 'fetch_error',
      safeErrorMessage: 'Network request failed',
    });
    expect(
      getApiErrorDiagnostics({
        status: 'FETCH_ERROR',
        error: 'Unknown host private.example',
      }).safeErrorMessage,
    ).toBe('DNS resolution failed');
    expect(
      getApiErrorDiagnostics({
        status: 'PARSING_ERROR',
        originalStatus: 502,
        error: 'Response body contains private details',
      }),
    ).toEqual({
      httpStatus: 502,
      errorCategory: 'parsing_error',
      safeErrorMessage: 'Response could not be parsed',
    });
  });

  it('formats only fields selected by the caller', () => {
    const output = formatApiDiagnostic('request.failed', {
      method: 'GET',
      path: safeApiPath('/categories?email=private@example.com'),
      authPresent: true,
    });

    expect(output).toContain('[API] request.failed');
    expect(output).toContain('"authPresent":true');
    expect(output).not.toContain('private@example.com');
  });

  it('reports safe Google and Firebase failure stages without raw messages', () => {
    expect(
      getSafeAuthErrorDetails(
        '10',
        'DEVELOPER_ERROR: https://private.example?token=secret',
      ),
    ).toEqual({
      errorCode: 'GOOGLE_STATUS_10',
      safeErrorMessage: 'Google rejected the Android app OAuth configuration.',
    });
    expect(
      getSafeAuthErrorDetails(
        'auth/invalid-credential',
        'Credential for private@example.com was invalid',
      ),
    ).toEqual({
      errorCode: 'auth/invalid-credential',
      safeErrorMessage: 'Firebase rejected the Google credential.',
    });
    expect(getSafeAuthErrorDetails('secret-token-value', 'private detail')).toEqual({
      errorCode: 'SIGN_IN_FAILED',
      safeErrorMessage: 'Google sign-in failed during this step.',
    });
  });
});
