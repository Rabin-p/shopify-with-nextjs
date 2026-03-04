'use client';

import { useSyncExternalStore } from 'react';

const WISHLIST_STORAGE_KEY = 'wishlist_product_ids';
const EMPTY_PRODUCT_IDS: string[] = [];

let lastSerializedSnapshot: string | null = null;
let lastParsedSnapshot: string[] = EMPTY_PRODUCT_IDS;

function normalizeProductIds(value: unknown) {
  if (!Array.isArray(value)) return EMPTY_PRODUCT_IDS;

  return [...new Set(value)]
    .filter(
      (id): id is string =>
        typeof id === 'string' && id.includes('gid://shopify/Product/')
    )
    .map((id) => id.trim())
    .filter(Boolean);
}

function parseSnapshot(raw: string | null) {
  if (!raw) return EMPTY_PRODUCT_IDS;

  try {
    return normalizeProductIds(JSON.parse(raw));
  } catch {
    return EMPTY_PRODUCT_IDS;
  }
}

function getSnapshot() {
  if (typeof window === 'undefined') return EMPTY_PRODUCT_IDS;

  const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
  if (raw === lastSerializedSnapshot) {
    return lastParsedSnapshot;
  }

  const nextParsed = parseSnapshot(raw);
  lastSerializedSnapshot = raw;
  lastParsedSnapshot = nextParsed;
  return nextParsed;
}

function writeWishlistIds(productIds: string[]) {
  if (typeof window === 'undefined') return;

  const next = normalizeProductIds(productIds);
  const serialized = JSON.stringify(next);
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, serialized);
  lastSerializedSnapshot = serialized;
  lastParsedSnapshot = next;
  window.dispatchEvent(new Event('wishlist:changed'));
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === WISHLIST_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener('wishlist:changed', onStoreChange);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('wishlist:changed', onStoreChange);
  };
}

export function useLocalWishlist() {
  const productIds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => EMPTY_PRODUCT_IDS
  );

  const add = (productId: string) => {
    if (!productId.includes('gid://shopify/Product/')) return;
    if (productIds.includes(productId)) return;
    writeWishlistIds([...productIds, productId]);
  };

  const remove = (productId: string) => {
    writeWishlistIds(productIds.filter((id) => id !== productId));
  };

  const toggle = (productId: string) => {
    if (!productId.includes('gid://shopify/Product/')) return;
    if (productIds.includes(productId)) {
      writeWishlistIds(productIds.filter((id) => id !== productId));
      return;
    }
    writeWishlistIds([...productIds, productId]);
  };

  const clear = () => {
    writeWishlistIds([]);
  };

  return {
    productIds,
    count: productIds.length,
    add,
    remove,
    toggle,
    clear,
    isWishlisted: (productId: string) => productIds.includes(productId),
  };
}
