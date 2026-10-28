import {
  formatApiDiagnostic,
  getApiErrorDiagnostics,
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
});
