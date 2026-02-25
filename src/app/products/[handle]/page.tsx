'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductNode } from '@/types/productTypes';
import { useCartStore } from '@/lib/cartStore';

type ProductDetailsResponse = {
  success: boolean;
  product?: ProductNode;
  message?: string;
};

const fetchProductByHandle = async (handle: string): Promise<ProductDetailsResponse> => {
  const res = await fetch(`/api/products/${encodeURIComponent(handle)}`);

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as ProductDetailsResponse;
    throw new Error(errorData.message || 'Failed to fetch product');
  }

  return res.json();
};

export default function ProductDetailsPage() {
  const params = useParams<{ handle: string }>();
  const handle = params?.handle || '';
  const { addToCart } = useCartStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['product', handle],
    queryFn: () => fetchProductByHandle(handle),
    enabled: Boolean(handle),
  });

  const product = data?.product;

  const handleAddToCart = () => {
    if (!product) return;

    const variantId = product.variants?.edges[0]?.node.id;

    addToCart({
      id: variantId || product.id,
      title: product.title,
      handle: product.handle,
      price: {
        amount: product.priceRange.minVariantPrice.amount,
        currencyCode: product.priceRange.minVariantPrice.currencyCode,
      },
      featuredImage: product.featuredImage,
      variantId: variantId,
      productId: product.id,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-32 bg-muted animate-pulse rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square w-full bg-muted animate-pulse rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-6 w-1/3 bg-muted animate-pulse rounded" />
              <div className="h-24 w-full bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <p className="text-destructive">{error instanceof Error ? error.message : 'Product not found'}</p>
          <Button asChild variant="outline" className='cursor-pointer'>
            <Link href="/products/all">Back to products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button asChild variant="outline" className='cursor-pointer'>
            <Link href="/products/all">Back to products</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square relative rounded-lg overflow-hidden border">
            <Image
              src={product.featuredImage?.url || '/placeholder.png'}
              alt={product.title}
              fill
              className="object-cover"
            />
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold">{product.title}</h1>
            <Badge className="text-sm px-3 py-1">
              {product.priceRange.minVariantPrice.currencyCode} {product.priceRange.minVariantPrice.amount}
            </Badge>
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            <Button
              onClick={handleAddToCart}
              className="w-full md:w-auto cursor-pointer"
              size="lg"
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
