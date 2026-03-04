'use client';

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

export default function WishlistPage() {
  const router = useRouter();
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
            const defaultVariant = product.variants?.edges[0]?.node;
            const price = defaultVariant?.priceV2 || product.priceRange.minVariantPrice;
            const canAddToCart = Boolean(defaultVariant?.availableForSale);

            return (
              <Card key={product.id} className="flex h-full flex-col">
                <Link href={`/products/${product.handle}`} className="flex-1">
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
                    onClick={() => {
                      if (!defaultVariant?.id || !canAddToCart) return;
                      addToCart({
                        id: defaultVariant.id,
                        title: product.title,
                        variantTitle:
                          defaultVariant.title !== 'Default Title'
                            ? defaultVariant.title
                            : undefined,
                        handle: product.handle,
                        price: {
                          amount: price.amount,
                          currencyCode: price.currencyCode,
                        },
                        featuredImage: product.featuredImage,
                        variantId: defaultVariant.id,
                        productId: product.id,
                      });
                    }}
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
