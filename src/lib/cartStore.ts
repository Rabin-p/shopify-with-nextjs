'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Cart } from '@/types/cartTypes';

interface CartStore {
  cart: Cart;
  isOpen: boolean;
  isSyncingPersistentCart: boolean;
  hasPersistentCartSession: boolean;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: (options?: { skipSync?: boolean }) => void;
  toggleCart: () => void;
  closeCart: () => void;
  hydratePersistentCart: () => Promise<void>;
  syncPersistentCart: () => Promise<void>;
  disablePersistentCart: () => void;
  checkout: () => Promise<{
    success: boolean;
    checkoutUrl?: string;
    error?: string;
  }>;
}

const isValidCheckoutItem = (item: CartItem) =>
  item.quantity > 0 &&
  Boolean(item.variantId || item.id.includes('ProductVariant/'));

const normalizeCartItem = (item: CartItem): CartItem => ({
  ...item,
  id: item.variantId || item.id,
});

const buildCart = (items: CartItem[]): Cart => {
  const total = items.reduce(
    (sum, item) => sum + parseFloat(item.price.amount) * item.quantity,
    0
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    total,
    itemCount,
  };
};

const mergeCartItems = (serverItems: CartItem[], localItems: CartItem[]) => {
  const merged = new Map<string, CartItem>();

  for (const item of [...serverItems, ...localItems]) {
    const normalized = normalizeCartItem(item);
    const key = normalized.id;
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, {
        ...existing,
        quantity: existing.quantity + item.quantity,
      });
    } else {
      merged.set(key, normalized);
    }
  }

  return Array.from(merged.values()).filter(isValidCheckoutItem);
};

const areCartItemsEqual = (a: CartItem[], b: CartItem[]) => {
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort((x, y) => x.id.localeCompare(y.id));
  const sortedB = [...b].sort((x, y) => x.id.localeCompare(y.id));

  for (let i = 0; i < sortedA.length; i += 1) {
    const itemA = sortedA[i];
    const itemB = sortedB[i];
    if (!itemA || !itemB) return false;
    if (itemA.id !== itemB.id || itemA.quantity !== itemB.quantity)
      return false;
  }

  return true;
};

type ServerCartResponse = {
  authenticated?: boolean;
  success?: boolean;
  cart?: Cart;
};

async function putPersistentCart(items: CartItem[]) {
  return fetch('/api/cart', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items }),
  });
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: {
        items: [],
        total: 0,
        itemCount: 0,
      },
      isOpen: false,
      isSyncingPersistentCart: false,
      hasPersistentCartSession: false,

      addToCart: (newItem) => {
        set((state) => {
          const normalizedNewItem = normalizeCartItem({
            ...newItem,
            quantity: 1,
          });
          const existingItemIndex = state.cart.items.findIndex(
            (item) => item.id === normalizedNewItem.id
          );

          const updatedItems =
            existingItemIndex >= 0
              ? state.cart.items.map((item, index) =>
                  index === existingItemIndex
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
                )
              : [...state.cart.items, normalizedNewItem];

          return {
            cart: buildCart(updatedItems),
            isOpen: true,
          };
        });
        void get().syncPersistentCart();
      },

      removeFromCart: (id) => {
        set((state) => {
          const updatedItems = state.cart.items.filter(
            (item) => item.id !== id
          );

          return {
            cart: buildCart(updatedItems),
          };
        });
        void get().syncPersistentCart();
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(id);
          return;
        }

        set((state) => {
          const updatedItems = state.cart.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          );

          return {
            cart: buildCart(updatedItems),
          };
        });
        void get().syncPersistentCart();
      },

      clearCart: (options) => {
        set({
          cart: {
            items: [],
            total: 0,
            itemCount: 0,
          },
        });
        if (!options?.skipSync) {
          void get().syncPersistentCart();
        }
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      closeCart: () => {
        set({ isOpen: false });
      },

      hydratePersistentCart: async () => {
        set({ isSyncingPersistentCart: true });
        try {
          const response = await fetch('/api/cart', {
            cache: 'no-store',
          });

          if (!response.ok) {
            set({ hasPersistentCartSession: false });
            return;
          }

          const data = (await response.json()) as ServerCartResponse;
          if (!data.authenticated || !data.cart) {
            set({ hasPersistentCartSession: false });
            return;
          }

          const localItems = get()
            .cart.items.map(normalizeCartItem)
            .filter(isValidCheckoutItem);
          const serverItems = data.cart.items
            .map(normalizeCartItem)
            .filter(isValidCheckoutItem);

          // If local persisted cart already mirrors the server cart, do not
          // merge quantities again.
          if (areCartItemsEqual(localItems, serverItems)) {
            set({ cart: data.cart, hasPersistentCartSession: true });
            return;
          }

          const mergedItems = mergeCartItems(serverItems, localItems);

          if (!areCartItemsEqual(serverItems, mergedItems)) {
            const syncResponse = await putPersistentCart(mergedItems);

            if (syncResponse.ok) {
              const syncData =
                (await syncResponse.json()) as ServerCartResponse;
              if (syncData.success && syncData.cart) {
                set({ cart: syncData.cart, hasPersistentCartSession: true });
              } else {
                set({
                  cart: buildCart(mergedItems),
                  hasPersistentCartSession: true,
                });
              }
            } else {
              set({
                cart: buildCart(mergedItems),
                hasPersistentCartSession: true,
              });
            }
          } else {
            set({ cart: data.cart, hasPersistentCartSession: true });
          }
        } catch (error) {
          console.error('Persistent cart hydration failed:', error);
        } finally {
          set({ isSyncingPersistentCart: false });
        }
      },

      syncPersistentCart: async () => {
        // Skip sync until we establish whether this user has an authenticated
        // session and a server-side cart.
        if (!get().hasPersistentCartSession) return;

        const cartItems = get()
          .cart.items.map(normalizeCartItem)
          .filter(isValidCheckoutItem);

        try {
          await putPersistentCart(cartItems);
        } catch (error) {
          console.error('Persistent cart sync failed:', error);
        }
      },

      disablePersistentCart: () => {
        set({
          hasPersistentCartSession: false,
          isSyncingPersistentCart: false,
        });
      },

      checkout: async () => {
        const { cart } = get();

        if (cart.items.length === 0) {
          return { success: false, error: 'Cart is empty' };
        }

        const normalizedItems = cart.items.map(normalizeCartItem);
        const validItems = normalizedItems.filter(isValidCheckoutItem);

        // Heal old persisted carts that were stored with non-variant IDs.
        if (
          validItems.length !== cart.items.length ||
          normalizedItems.some((item, idx) => item.id !== cart.items[idx]?.id)
        ) {
          set({ cart: buildCart(validItems) });
        }

        if (validItems.length === 0) {
          return {
            success: false,
            error:
              'Your cart had outdated items and was refreshed. Please add products again.',
          };
        }

        try {
          const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items: validItems }),
          });

          const data = await response.json();

          if (data.success) {
            // Clear cart and close drawer on successful checkout
            get().clearCart({ skipSync: true });
            get().closeCart();
            return { success: true, checkoutUrl: data.checkoutUrl };
          } else {
            return { success: false, error: data.message || 'Checkout failed' };
          }
        } catch (error) {
          console.error('Checkout error:', error);
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to process checkout';
          return { success: false, error: message };
        }
      },
    }),
    {
      name: 'cart-storage',
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<CartStore>;
        const persistedItems = Array.isArray(state?.cart?.items)
          ? state.cart.items
          : [];
        const migratedItems = persistedItems
          .map(normalizeCartItem)
          .filter(isValidCheckoutItem);

        return {
          ...state,
          cart: buildCart(migratedItems),
        };
      },
    }
  )
);
