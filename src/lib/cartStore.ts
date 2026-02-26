'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Cart } from '@/types/cartTypes';

interface CartStore {
  cart: Cart;
  isOpen: boolean;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  closeCart: () => void;
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

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: {
        items: [],
        total: 0,
        itemCount: 0,
      },
      isOpen: false,

      addToCart: (newItem) => {
        set((state) => {
          const normalizedNewItem = normalizeCartItem({
            ...newItem,
            quantity: 1,
          });
          const existingItemIndex = state.cart.items.findIndex(
            (item) => item.id === normalizedNewItem.id
          );

          let updatedItems: CartItem[];

          if (existingItemIndex >= 0) {
            // Item exists, update quantity
            updatedItems = state.cart.items.map((item, index) =>
              index === existingItemIndex
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
          } else {
            // New item, add to cart
            updatedItems = [...state.cart.items, normalizedNewItem];
          }

          return {
            cart: buildCart(updatedItems),
            isOpen: true, // Open drawer when item is added
          };
        });
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
      },

      clearCart: () => {
        set({
          cart: {
            items: [],
            total: 0,
            itemCount: 0,
          },
        });
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      closeCart: () => {
        set({ isOpen: false });
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
            get().clearCart();
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
