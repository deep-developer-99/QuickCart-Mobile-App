import type { ProductVariant } from '../api/quickCartApi';

export const variantDiscountPrice = (variant?: ProductVariant) => {
  const price = Number(variant?.price);
  const discountPrice = Number(variant?.discountPrice);
  return Number.isFinite(price) && price > 0 && Number.isFinite(discountPrice) && discountPrice > 0 && discountPrice < price
    ? discountPrice
    : undefined;
};

export const hasVariantDiscount = (variant?: ProductVariant) =>
  variantDiscountPrice(variant) !== undefined;

export const variantDiscountPercentage = (variant?: ProductVariant) => {
  const price = Number(variant?.price);
  const discountPrice = variantDiscountPrice(variant);
  return discountPrice === undefined || !Number.isFinite(price) || price <= 0
    ? 0
    : Math.round(((price - discountPrice) / price) * 100);
};

export const variantSellingPrice = (variant?: ProductVariant) =>
  variantDiscountPrice(variant) ?? (Number.isFinite(Number(variant?.price)) && Number(variant?.price) > 0 ? Number(variant?.price) : 0);

export const lowestPricedVariant = (variants?: ProductVariant[] | null) =>
  (Array.isArray(variants) ? variants : [])
    .filter(variant => variant.isActive === true && Number.isFinite(Number(variant.stock)) && Number(variant.stock) > 0 && Number.isFinite(Number(variant.price)) && Number(variant.price) > 0)
    .slice()
    .sort((a, b) => variantSellingPrice(a) - variantSellingPrice(b))[0];
