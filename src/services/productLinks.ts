/** Canonical production host shared by product URLs and Android App Links. */
export const PRODUCT_LINK_HOST: string = 'quick-cart-indol-rho-13.vercel.app';

const PRODUCT_ID_PATTERN = /^[a-f\d]{24}$/i;

export const isValidProductId = (value: unknown): value is string =>
  typeof value === 'string' && PRODUCT_ID_PATTERN.test(value);

export const createProductUrl = (productId: string): string | null => {
  if (!isValidProductId(productId) || !PRODUCT_LINK_HOST) return null;
  return `https://${PRODUCT_LINK_HOST}/products/${encodeURIComponent(productId)}`;
};

export const parseProductUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !PRODUCT_LINK_HOST ||
      url.hostname.toLowerCase() !== PRODUCT_LINK_HOST.toLowerCase() ||
      url.port ||
      url.username ||
      url.password
    ) {
      return null;
    }

    const match = /^\/products\/([^/]+)\/?$/.exec(url.pathname);
    if (!match) return null;

    const productId = decodeURIComponent(match[1]);
    return isValidProductId(productId) ? productId : null;
  } catch {
    return null;
  }
};

let pendingProductId: string | null = null;

export const setPendingProductId = (productId: string): void => {
  pendingProductId = isValidProductId(productId) ? productId : null;
};

export const consumePendingProductId = (): string | null => {
  const value = pendingProductId;
  pendingProductId = null;
  return value;
};
