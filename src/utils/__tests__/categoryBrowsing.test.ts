import {
  appendUniqueProducts,
  buildCategoryProductQuery,
  CATEGORY_PRODUCT_PAGE_SIZE,
  getSubcategoriesPath,
} from '../categoryBrowsing';

describe('category product browsing helpers', () => {
  it('requests exactly 15 products with the parent and selected subcategory', () => {
    expect(buildCategoryProductQuery('parent-id', 'sub-id', 1, null)).toEqual({
      category: 'parent-id',
      subCategory: 'sub-id',
      page: 1,
      limit: 15,
    });
    expect(CATEGORY_PRODUCT_PAGE_SIZE).toBe(15);
  });

  it('loads subcategories using the selected parent category ID', () => {
    expect(getSubcategoriesPath('parent id')).toBe('/categories/parent%20id/subcategories');
  });

  it('includes the selected server sort in each paginated request', () => {
    expect(buildCategoryProductQuery('parent-id', 'sub-id', 2, 'priceLow')).toEqual({
      category: 'parent-id',
      subCategory: 'sub-id',
      sort: 'priceLow',
      page: 2,
      limit: 15,
    });
  });

  it('appends new products and drops duplicate product IDs', () => {
    expect(appendUniqueProducts(
      [{ _id: 'one' }, { _id: 'two' }],
      [{ _id: 'two' }, { _id: 'three' }],
    )).toEqual([{ _id: 'one' }, { _id: 'two' }, { _id: 'three' }]);
  });
});
