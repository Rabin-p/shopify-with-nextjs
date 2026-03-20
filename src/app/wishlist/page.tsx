'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCartStore } from '@/lib/cartStore';
import { isAnimatedImage } from '@/lib/isAnimatedImage';
import type { ProductNode } from '@/types/productTypes';
import { useLocalWishlist } from '@/lib/wishlistLocal';

type ProductsByIdsResponse = {
  success: boolean;
  message?: string;
  products: ProductNode[];
};

async function fetchProductsByIds(productIds: string[]) {
  const response = await fetch('/api/products/by-ids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: productIds }),
  });

  const data = (await response.json()) as ProductsByIdsResponse;
  if (!response.ok) {
    throw new Error(data.message || 'Failed to load wishlist products');
  }

  return Array.isArray(data.products) ? data.products : [];
}

const getVariantUrlToken = (variantId: string) => variantId.split('/').pop() || variantId;

export default function WishlistPage() {
  const router = useRouter();
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const { addToCart } = useCartStore();
  const {
    productIds: wishlistIds,
    remove: removeFromWishlist,
    clear: clearWishlist,
  } = useLocalWishlist();

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['wishlist-products', wishlistIds],
    queryFn: () => fetchProductsByIds(wishlistIds),
    enabled: wishlistIds.length > 0,
    staleTime: 15 * 1000,
  });

  const getSelectedVariant = (product: ProductNode) => {
    const variants = product.variants?.edges.map((edge) => edge.node) || [];
    const selectedVariantId = selectedVariants[product.id];
    return (
      variants.find((variant) => variant.id === selectedVariantId) ||
      variants.find((variant) => variant.availableForSale) ||
      variants[0]
    );
  };

  const handleVariantChange = (productId: string, variantId: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [productId]: variantId,
    }));
  };

  const handleAddToCart = (product: ProductNode) => {
    const selectedVariant = getSelectedVariant(product);
    const isSelectedVariantAvailable = Boolean(selectedVariant?.availableForSale);
    if (!selectedVariant?.id || !isSelectedVariantAvailable) return;

    const variantTitle =
      selectedVariant.title !== 'Default Title' ? selectedVariant.title : undefined;
    const price = selectedVariant.priceV2 || product.priceRange.minVariantPrice;

    addToCart({
      id: selectedVariant.id,
      title: product.title,
      variantTitle,
      handle: product.handle,
      price: {
        amount: price.amount,
        currencyCode: price.currencyCode,
      },
      featuredImage: product.featuredImage,
      variantId: selectedVariant.id,
      productId: product.id,
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold">Wishlist</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-80 w-full animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error instanceof Error) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="mb-4 text-3xl font-bold">Wishlist</h1>
        <p className="text-destructive">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Wishlist</h1>
          <p className="text-sm text-muted-foreground">
            {wishlistIds.length} item{wishlistIds.length === 1 ? '' : 's'}
          </p>
        </div>
        {wishlistIds.length > 0 ? (
          <Button variant="outline" onClick={clearWishlist}>
            Clear wishlist
          </Button>
        ) : null}
      </div>

      {wishlistIds.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-muted-foreground">Your wishlist is empty.</p>
          <Button asChild className="mt-4">
            <Link href="/products/all">Browse products</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => {
            const variants = product.variants?.edges.map((edge) => edge.node) || [];
            const selectedVariant = getSelectedVariant(product);
            const price = selectedVariant?.priceV2 || product.priceRange.minVariantPrice;
            const canAddToCart = Boolean(selectedVariant?.availableForSale);
            const productHref = selectedVariant
              ? `/products/${product.handle}?variant=${encodeURIComponent(getVariantUrlToken(selectedVariant.id))}`
              : `/products/${product.handle}`;

            return (
              <Card key={product.id} className="flex h-full flex-col">
                <Link href={productHref} className="flex-1">
                  <div className="relative aspect-square">
                    <Image
                      src={product.featuredImage?.url || '/placeholder.png'}
                      alt={product.title}
                      fill
                      unoptimized={isAnimatedImage(product.featuredImage?.url)}
                      className="object-contain"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-1 text-md">{product.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="line-clamp-2 text-sm text-muted-foreground">
                    {product.description}
                  </CardContent>
                </Link>
                <CardFooter className="mt-auto flex flex-col items-stretch gap-3">
                  {variants.length > 1 && (
                    <select
                      value={selectedVariant?.id || ''}
                      onChange={(e) => handleVariantChange(product.id, e.target.value)}
                      className="w-full rounded-md border bg-background px-2 py-1 text-xs"
                    >
                      {variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.title}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge>
                      {price.currencyCode} {price.amount}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove from wishlist"
                      onClick={() => removeFromWishlist(product.id)}
                    >
                      <Heart className="h-4 w-4 fill-current text-rose-600" />
                    </Button>
                  </div>
                  <Button
                    onClick={() => handleAddToCart(product)}
                    disabled={!canAddToCart}
                  >
                    {canAddToCart ? 'Add to Cart' : 'Out of stock'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
      <div className="mt-8">
        <Button variant="outline" onClick={() => router.push('/products/all')}>
          Continue shopping
        </Button>
      </div>
    </div>
  );
}
