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

export const activeVariantCount = (variants?: ProductVariant[] | null) =>
  (Array.isArray(variants) ? variants : []).filter(variant => variant.isActive === true).length;

export const normalizedVariantPrice = (variant?: ProductVariant) => {
  const quantity = Number(variant?.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return undefined;
  const unit = variant?.unit?.trim().toLowerCase();
  if (unit === 'g' || unit === 'gram' || unit === 'grams') return { price: variantSellingPrice(variant) * 100 / quantity, unit: '100 g' };
  if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') return { price: variantSellingPrice(variant) / (quantity * 10), unit: '100 g' };
  if (unit === 'ml' || unit === 'milliliter' || unit === 'milliliters' || unit === 'millilitre' || unit === 'millilitres') return { price: variantSellingPrice(variant) * 100 / quantity, unit: '100 ml' };
  if (unit === 'l' || unit === 'lt' || unit === 'liter' || unit === 'liters' || unit === 'litre' || unit === 'litres') return { price: variantSellingPrice(variant) / (quantity * 10), unit: '100 ml' };
  return undefined;
};
