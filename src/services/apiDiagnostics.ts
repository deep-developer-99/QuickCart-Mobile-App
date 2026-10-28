export type ApiDiagnosticError =
  | { status: number }
  | {
      status: 'FETCH_ERROR' | 'TIMEOUT_ERROR' | 'PARSING_ERROR' | 'CUSTOM_ERROR';
      error?: string;
      originalStatus?: number;
    };

export const safeApiPath = (path: string): string =>
  path.split('?')[0].slice(0, 256) || '/';

export const getApiErrorDiagnostics = (
  error: ApiDiagnosticError,
): {
  httpStatus?: number;
  errorCategory: string;
  safeErrorMessage?: string;
} => {
  if (typeof error.status === 'number') {
    return { httpStatus: error.status, errorCategory: 'http_error' };
  }

  const message = error.error ?? '';
  const safeErrorMessage =
    error.status === 'FETCH_ERROR'
      ? /timeout/i.test(message)
        ? 'Request timed out'
        : /abort/i.test(message)
          ? 'Request was aborted'
          : /unknown host|enotfound|dns/i.test(message)
            ? 'DNS resolution failed'
            : /ssl|certificate|handshake/i.test(message)
              ? 'TLS connection failed'
              : 'Network request failed'
      : error.status === 'TIMEOUT_ERROR'
        ? 'Request timed out'
        : error.status === 'PARSING_ERROR'
          ? 'Response could not be parsed'
          : 'Request failed before a response';

  return {
    ...(error.status === 'PARSING_ERROR'
      ? { httpStatus: error.originalStatus }
      : {}),
    errorCategory: error.status.toLowerCase(),
    safeErrorMessage,
  };
};

export const formatApiDiagnostic = (
  event: string,
  fields: Record<string, unknown>,
): string => `[API] ${event} ${JSON.stringify(fields)}`;

export const logApiDiagnostic = (
  level: 'info' | 'warn',
  event: string,
  fields: Record<string, unknown>,
): void => {
  console[level](formatApiDiagnostic(event, fields));
};
