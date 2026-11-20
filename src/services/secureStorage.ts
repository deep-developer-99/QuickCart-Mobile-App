import * as Keychain from 'react-native-keychain';

const TOKEN_SERVICE = 'quickcart-auth-token';
let mutations: Promise<void> = Promise.resolve();

const serialize = (operation: () => Promise<void>) => {
  const next = mutations.catch(() => {}).then(operation);
  mutations = next;
  return next;
};

export const saveToken = async (token: string): Promise<void> => {
  if (typeof token !== 'string' || !token.trim()) throw new Error('Cannot save an empty authentication token');
  return serialize(async () => {
    await Keychain.setGenericPassword('quickcart', token.trim(), { service: TOKEN_SERVICE });
  });
};

export const getToken = async (): Promise<string | null> => {
  await mutations.catch(() => {});
  const credentials = await Keychain.getGenericPassword({ service: TOKEN_SERVICE });
  return credentials ? credentials.password : null;
};

export const removeToken = (expectedToken?: string | null): Promise<void> =>
  serialize(async () => {
    if (expectedToken !== undefined) {
      const credentials = await Keychain.getGenericPassword({ service: TOKEN_SERVICE });
      if (!credentials || credentials.password !== expectedToken) return;
    }
    await Keychain.resetGenericPassword({ service: TOKEN_SERVICE });
  });
