import type { CartProduct } from '../../../api/quickCartApi';
import { logout, setCredentials } from '../authSlice';
import reducer, {
  selectWishlistIds,
  wishlistHydrated,
  wishlistOperationRolledBack,
  wishlistOperationSettled,
  wishlistOptimisticSet,
} from '../wishlistSlice';
import type { RootState } from '../../store';

const milk: CartProduct = { _id: 'milk', name: 'Milk' };
const bread: CartProduct = { _id: 'bread', name: 'Bread' };

const forUser = () => reducer(undefined, setCredentials({
  user: { id: 'user-a', name: 'Customer', email: 'customer@example.test', role: 'user' },
  token: 'test-token',
}));

const setWishlisted = (
  state: ReturnType<typeof reducer>,
  product: CartProduct,
  isWishlisted: boolean,
  operationId: string,
) => reducer(state, wishlistOptimisticSet({
  userId: 'user-a',
  productId: product._id,
  product,
  isWishlisted,
  operationId,
}));

describe('central wishlist state', () => {
  it('shows an item immediately and prevents duplicate additions', () => {
    let state = forUser();
    state = setWishlisted(state, milk, true, 'add-1');
    state = setWishlisted(state, milk, true, 'add-2');

    expect(state.items).toEqual([milk]);
    expect(state.isLoaded).toBe(false);
  });

  it('rolls back a failed add to the confirmed state', () => {
    let state = forUser();
    state = setWishlisted(state, milk, true, 'add-1');
    expect(state.items).toEqual([milk]);

    state = reducer(state, wishlistOperationRolledBack({
      userId: 'user-a', productId: milk._id, operationId: 'add-1',
    }));
    expect(state.items).toEqual([]);
  });

  it('removes immediately and restores the confirmed product after a failed removal', () => {
    let state = forUser();
    state = reducer(state, wishlistHydrated({ userId: 'user-a', startedAtRevision: 0, products: [milk] }));
    state = setWishlisted(state, milk, false, 'remove-1');
    expect(state.items).toEqual([]);

    state = reducer(state, wishlistOperationRolledBack({
      userId: 'user-a', productId: milk._id, operationId: 'remove-1',
    }));
    expect(state.items).toEqual([milk]);
  });

  it('ignores stale failures after a newer tap and restores the latest confirmed result', () => {
    let state = forUser();
    state = setWishlisted(state, milk, true, 'add-1');
    state = setWishlisted(state, milk, false, 'remove-2');
    state = reducer(state, wishlistOperationRolledBack({
      userId: 'user-a', productId: milk._id, operationId: 'add-1',
    }));
    expect(state.items).toEqual([]);

    state = reducer(state, wishlistOperationRolledBack({
      userId: 'user-a', productId: milk._id, operationId: 'remove-2',
    }));
    expect(state.items).toEqual([]);

    state = setWishlisted(state, milk, true, 'add-3');
    state = reducer(state, wishlistOperationSettled({
      userId: 'user-a', productId: milk._id, operationId: 'add-3', isWishlisted: true, product: milk,
    }));
    state = setWishlisted(state, milk, false, 'remove-4');
    state = reducer(state, wishlistOperationRolledBack({
      userId: 'user-a', productId: milk._id, operationId: 'remove-4',
    }));
    expect(state.items).toEqual([milk]);
  });

  it('allows independent products to update concurrently', () => {
    let state = forUser();
    state = setWishlisted(state, milk, true, 'milk-add');
    state = setWishlisted(state, bread, true, 'bread-add');
    state = reducer(state, wishlistOperationRolledBack({
      userId: 'user-a', productId: milk._id, operationId: 'milk-add',
    }));
    expect(state.items).toEqual([bread]);
  });

  it('preserves an optimistic action when the initial fetch resolves late', () => {
    let state = forUser();
    const fetchRevision = state.revision;
    state = setWishlisted(state, milk, true, 'add-1');
    state = reducer(state, wishlistHydrated({
      userId: 'user-a', startedAtRevision: fetchRevision, products: [bread],
    }));
    expect(state.items).toEqual([bread, milk]);
  });

  it('reconciles a successful local operation over a stale fetch response', () => {
    let state = forUser();
    const fetchRevision = state.revision;
    state = setWishlisted(state, milk, true, 'add-1');
    state = reducer(state, wishlistOperationSettled({
      userId: 'user-a', productId: milk._id, operationId: 'add-1', isWishlisted: true, product: milk,
    }));
    state = reducer(state, wishlistHydrated({
      userId: 'user-a', startedAtRevision: fetchRevision, products: [bread],
    }));
    expect(state.items).toEqual([bread, milk]);
  });

  it('does not allow a pending response to repopulate data after logout', () => {
    let state = forUser();
    state = setWishlisted(state, milk, true, 'add-1');
    state = reducer(state, logout());
    state = reducer(state, wishlistHydrated({ userId: 'user-a', startedAtRevision: 0, products: [milk] }));
    expect(state).toMatchObject({ ownerId: null, items: [], confirmedItems: [], isLoaded: false });
  });

  it('derives all screen heart states from the shared wishlist selector', () => {
    const state = reducer(forUser(), wishlistHydrated({ userId: 'user-a', startedAtRevision: 0, products: [milk] }));
    const rootState = { wishlist: state } as RootState;
    expect(selectWishlistIds(rootState).has(milk._id)).toBe(true);
    expect(selectWishlistIds(rootState).has(bread._id)).toBe(false);
  });
});
