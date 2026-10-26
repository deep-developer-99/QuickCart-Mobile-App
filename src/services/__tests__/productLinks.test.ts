import {
  consumePendingProductId,
  createProductUrl,
  isValidProductId,
  parseProductUrl,
  setPendingProductId,
} from '../productLinks';

const productId = '507f1f77bcf86cd799439011';

describe('product links', () => {
  it('creates and parses the canonical HTTPS product URL', () => {
    const url = createProductUrl(productId);
    expect(url).toBe(
      'https://quick-cart-indol-rho-13.vercel.app/products/507f1f77bcf86cd799439011',
    );
    expect(parseProductUrl(url!)).toBe(productId);
  });

  it('creates distinct canonical URLs for different products and accepts query parameters', () => {
    const secondProductId = '507f191e810c19729de860ea';
    const firstUrl = createProductUrl(productId);
    const secondUrl = createProductUrl(secondProductId);

    expect(firstUrl).not.toBe(secondUrl);
    expect(parseProductUrl(`${secondUrl}?utm_source=share`)).toBe(secondProductId);
  });

  it('rejects malformed IDs, paths, hosts, and non-HTTPS URLs', () => {
    expect(isValidProductId('not-an-id')).toBe(false);
    expect(parseProductUrl('https://example.com/products/' + productId)).toBe(
      null,
    );
    expect(
      parseProductUrl(
        'http://quick-cart-indol-rho-13.vercel.app/products/' + productId,
      ),
    ).toBe(null);
    expect(
      parseProductUrl(
        'https://quick-cart-indol-rho-13.vercel.app/anything/' + productId,
      ),
    ).toBe(null);
    expect(
      parseProductUrl(
        'https://quick-cart-indol-rho-13.vercel.app/products/not-an-id',
      ),
    ).toBe(null);
  });

  it('consumes a pending product destination once', () => {
    setPendingProductId(productId);
    expect(consumePendingProductId()).toBe(productId);
    expect(consumePendingProductId()).toBe(null);
  });
});
