import type { ProductsQuery } from '../api/quickCartApi';

export const CATEGORY_PRODUCT_PAGE_SIZE = 15;

export const getSubcategoriesPath = (parentCategoryId: string) =>
  `/categories/${encodeURIComponent(parentCategoryId)}/subcategories`;

export const buildCategoryProductQuery = (
  categoryId: string,
  subCategoryId: string | undefined,
  page: number,
  sort?: 'priceLow' | 'priceHigh' | 'az' | 'za' | null,
): Exclude<ProductsQuery, string | undefined> => ({
  category: categoryId,
  ...(subCategoryId ? { subCategory: subCategoryId } : {}),
  ...(sort ? { sort } : {}),
  page,
  limit: CATEGORY_PRODUCT_PAGE_SIZE,
});

export const appendUniqueProducts = <T extends { _id: string }>(
  current: T[],
  incoming: T[],
) => {
  const seen = new Set(current.map(product => product._id));
  return [...current, ...incoming.filter(product => !seen.has(product._id))];
};
