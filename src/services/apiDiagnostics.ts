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

export const getSafeAuthErrorDetails = (
  code: unknown,
  message: unknown,
): { errorCode: string; safeErrorMessage: string } => {
  const normalizedCode =
    typeof code === 'string' || typeof code === 'number' ? String(code) : '';
  const safeFirebaseCodes = new Set([
    'auth/account-exists-with-different-credential',
    'auth/invalid-credential',
    'auth/network-request-failed',
    'auth/operation-not-allowed',
    'auth/user-disabled',
  ]);
  const safeGoogleCodes = new Set([
    'IN_PROGRESS',
    'NULL_PRESENTER',
    'PLAY_SERVICES_NOT_AVAILABLE',
    'SIGN_IN_CANCELLED',
    'SIGN_IN_REQUIRED',
  ]);
  const safeCode =
    /^\d{1,5}$/.test(normalizedCode) ||
    safeFirebaseCodes.has(normalizedCode) ||
    safeGoogleCodes.has(normalizedCode);
  const safeText = typeof message === 'string' ? message : '';

  if (normalizedCode === '10' || /developer_error/i.test(safeText)) {
    return {
      errorCode: 'GOOGLE_STATUS_10',
      safeErrorMessage: 'Google rejected the Android app OAuth configuration.',
    };
  }
  if (normalizedCode === '7' || normalizedCode === 'auth/network-request-failed') {
    return {
      errorCode: safeCode ? normalizedCode : 'NETWORK_ERROR',
      safeErrorMessage: 'The network connection failed during sign-in.',
    };
  }
  if (normalizedCode === '12500') {
    return {
      errorCode: 'GOOGLE_STATUS_12500',
      safeErrorMessage: 'Google could not complete sign-in.',
    };
  }
  if (normalizedCode === '12502' || normalizedCode === 'IN_PROGRESS') {
    return {
      errorCode: 'GOOGLE_SIGN_IN_IN_PROGRESS',
      safeErrorMessage: 'Another Google sign-in operation is already running.',
    };
  }
  if (normalizedCode === 'PLAY_SERVICES_NOT_AVAILABLE') {
    return {
      errorCode: normalizedCode,
      safeErrorMessage: 'Google Play Services is unavailable or out of date.',
    };
  }
  if (normalizedCode === 'auth/invalid-credential') {
    return {
      errorCode: normalizedCode,
      safeErrorMessage: 'Firebase rejected the Google credential.',
    };
  }
  if (normalizedCode === 'auth/operation-not-allowed') {
    return {
      errorCode: normalizedCode,
      safeErrorMessage: 'Google sign-in is disabled for this Firebase project.',
    };
  }
  if (/id token.*(not returned|missing)|missing.*id token/i.test(safeText)) {
    return {
      errorCode: 'MISSING_ID_TOKEN',
      safeErrorMessage: 'Google Sign-In did not return an ID token.',
    };
  }
  if (/timeout|timed out/i.test(safeText)) {
    return {
      errorCode: 'SIGN_IN_TIMEOUT',
      safeErrorMessage: 'The sign-in request timed out.',
    };
  }

  return {
    errorCode: safeCode ? normalizedCode : 'SIGN_IN_FAILED',
    safeErrorMessage: 'Google sign-in failed during this step.',
  };
};
