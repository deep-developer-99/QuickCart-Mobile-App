import * as Keychain from 'react-native-keychain';

const TOKEN_SERVICE = 'quickcart-auth-token';

export const saveToken = async (token: string): Promise<void> => {
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Cannot save an empty authentication token');
  }

  await Keychain.setGenericPassword('quickcart', token.trim(), {
    service: TOKEN_SERVICE,
  });
};

export const getToken = async (): Promise<string | null> => {
  const credentials = await Keychain.getGenericPassword({
    service: TOKEN_SERVICE,
  });

  if (!credentials) {
    return null;
  }

  return credentials.password;
};

export const removeToken = async (): Promise<void> => {
  await Keychain.resetGenericPassword({
    service: TOKEN_SERVICE,
  });
};
