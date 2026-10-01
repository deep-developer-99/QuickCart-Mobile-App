import * as Keychain from 'react-native-keychain';

const TOKEN_SERVICE = 'quickcart-auth-token';

export const saveToken = async (token: string): Promise<void> => {
  await Keychain.setGenericPassword('quickcart', token, {
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
