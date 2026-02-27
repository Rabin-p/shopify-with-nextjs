import { Cart, CartItem } from '@/types/cartTypes';

export const isValidCheckoutItem = (item: CartItem) =>
  item.quantity > 0 &&
  Boolean(item.variantId || item.id.includes('ProductVariant/'));

export const normalizeCartItem = (item: CartItem): CartItem => ({
  ...item,
  id: item.variantId || item.id,
});

export const buildCart = (items: CartItem[]): Cart => {
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

export const mergeCartItems = (
  serverItems: CartItem[],
  localItems: CartItem[]
) => {
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

export const areCartItemsEqual = (a: CartItem[], b: CartItem[]) => {
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort((x, y) => x.id.localeCompare(y.id));
  const sortedB = [...b].sort((x, y) => x.id.localeCompare(y.id));

  for (let i = 0; i < sortedA.length; i += 1) {
    const itemA = sortedA[i];
    const itemB = sortedB[i];
    if (!itemA || !itemB) return false;
    if (itemA.id !== itemB.id || itemA.quantity !== itemB.quantity) {
      return false;
    }
  }

  return true;
};
