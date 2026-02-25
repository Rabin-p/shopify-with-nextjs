'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ProductNode } from '@/types/productTypes';
import { Card, CardFooter, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/cartStore';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const fetchProducts = async (cursor: string | null) => {
  const url = cursor ? `/api/products?cursor=${cursor}` : '/api/products';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export default function AllProductsPage() {
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const { addToCart } = useCartStore();

  const currentCursor = cursorHistory[pageIndex];

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['products', currentCursor],
    queryFn: () => fetchProducts(currentCursor),
    placeholderData: keepPreviousData,
  });

  const products: ProductNode[] = data?.products || [];
  const hasNextPage = data?.hasNextPage;
  const nextCursor = data?.nextCursor;

  const handleNext = () => {
    if (hasNextPage && nextCursor) {
      if (pageIndex + 1 >= cursorHistory.length) {
        setCursorHistory((prev) => [...prev, nextCursor]);
      }
      setPageIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setPageIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleAddToCart = (product: ProductNode) => {
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

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">All Products</h1>
          <p className="text-muted-foreground">Viewing Page {pageIndex + 1}</p>
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${isPlaceholderData ? 'opacity-50' : 'opacity-100'}`}>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-80 w-full bg-muted animate-pulse rounded-lg" />
            ))
          ) : (
            products.map(product => (
              <Card key={product.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                <Link href={`/products/${product.handle}`} className="block flex-1">
                  <div className="aspect-square relative">
                    <Image
                      src={product.featuredImage?.url || '/placeholder.png'}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-md line-clamp-1">{product.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </CardContent>
                </Link>
                <CardFooter className="mt-auto flex items-center justify-between">
                  <Badge> {product.priceRange.minVariantPrice.currencyCode} {product.priceRange.minVariantPrice.amount}</Badge>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    className='cursor-pointer'
                  >
                    Add to Cart
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>

        {/* Pagination UI */}
        <div className="mt-10">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); handlePrevious(); }}
                  className={pageIndex === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              <PaginationItem>
                <span className="px-4 text-sm font-medium">
                  Page {pageIndex + 1}
                </span>
              </PaginationItem>

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleNext(); }}
                  className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}
