'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { ProductNode } from '@/types/productTypes';
import type {
  ProductFilterInput,
  ProductsResponse,
  SelectedFiltersState,
} from '@/types/productFilterTypes';
import { Card, CardFooter, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCartStore } from '@/lib/cartStore';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { isAnimatedImage } from '@/lib/isAnimatedImage';

const SORT_OPTIONS = [
  { value: "FEATURED", label: "Featured", sortKey: "COLLECTION_DEFAULT", reverse: false },
  { value: "BEST_SELLING", label: "Best selling", sortKey: "BEST_SELLING", reverse: false },
  { value: "NEWEST", label: "Newest", sortKey: "CREATED", reverse: true },
  { value: "PRICE_LOW_HIGH", label: "Price: Low to High", sortKey: "PRICE", reverse: false },
  { value: "PRICE_HIGH_LOW", label: "Price: High to Low", sortKey: "PRICE", reverse: true },
  { value: "TITLE_A_Z", label: "Title: A to Z", sortKey: "TITLE", reverse: false },
  { value: "TITLE_Z_A", label: "Title: Z to A", sortKey: "TITLE", reverse: true },
] as const;

type SortOptionValue = (typeof SORT_OPTIONS)[number]["value"];
type FilterInput = ProductFilterInput;

const fetchProducts = async ({
  cursor,
  sortKey,
  reverse,
  selectedFilters,
}: {
  cursor: string | null;
  sortKey: string;
  reverse: boolean;
  selectedFilters: string[];
}) => {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  params.set("sortKey", sortKey);
  if (reverse) params.set("reverse", "true");
  const normalized = normalizeFilterInputs(selectedFilters);
  normalized.availability.forEach((value) => params.append("availability", value));
  normalized.productTypes.forEach((value) => params.append("productType", value));
  normalized.vendors.forEach((value) => params.append("vendor", value));
  normalized.tags.forEach((value) => params.append("tag", value));
  normalized.prices.forEach((value) => params.append("price", value));

  const url = params.toString() ? `/api/products?${params.toString()}` : "/api/products";
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return (await res.json()) as ProductsResponse;
};

const getVariantUrlToken = (variantId: string) =>
  variantId.split('/').pop() || variantId;

const parseFilterInput = (input: string): FilterInput | null => {
  try {
    const parsed = JSON.parse(input) as FilterInput;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const normalizeFilterInputs = (filterInputs: string[]) => {
  const availability = new Set<string>();
  const productTypes = new Set<string>();
  const vendors = new Set<string>();
  const tags = new Set<string>();
  const prices = new Set<string>();

  for (const input of filterInputs) {
    const parsed = parseFilterInput(input);
    if (!parsed) continue;

    if (typeof parsed.available === "boolean") {
      availability.add(parsed.available ? "true" : "false");
    }
    if (parsed.productType) {
      productTypes.add(parsed.productType);
    }
    if (parsed.productVendor) {
      vendors.add(parsed.productVendor);
    }
    if (parsed.tag) {
      tags.add(parsed.tag);
    }
    if (parsed.price && (parsed.price.min !== undefined || parsed.price.max !== undefined)) {
      const minPart = parsed.price.min !== undefined ? String(parsed.price.min) : "";
      const maxPart = parsed.price.max !== undefined ? String(parsed.price.max) : "";
      prices.add(`${minPart}:${maxPart}`);
    }
  }

  return {
    availability: [...availability].sort((a, b) => a.localeCompare(b)),
    productTypes: [...productTypes].sort((a, b) => a.localeCompare(b)),
    vendors: [...vendors].sort((a, b) => a.localeCompare(b)),
    tags: [...tags].sort((a, b) => a.localeCompare(b)),
    prices: [...prices].sort((a, b) => a.localeCompare(b)),
  };
};

export default function AllProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedSort, setSelectedSort] = useState<SortOptionValue>("FEATURED");
  const [selectedFilters, setSelectedFilters] = useState<SelectedFiltersState>({});
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [draftSort, setDraftSort] = useState<SortOptionValue>("FEATURED");
  const [draftFilters, setDraftFilters] = useState<SelectedFiltersState>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const { addToCart } = useCartStore();

  const currentCursor = cursorHistory[pageIndex];
  const activeFilterInputs = useMemo(
    () =>
      Object.values(selectedFilters)
        .flat()
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [selectedFilters]
  );
  const activeFilterCount = activeFilterInputs.length;
  const sortConfig =
    SORT_OPTIONS.find((option) => option.value === selectedSort) ?? SORT_OPTIONS[0];

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['products', currentCursor, sortConfig.sortKey, sortConfig.reverse, activeFilterInputs],
    queryFn: () =>
      fetchProducts({
        cursor: currentCursor,
        sortKey: sortConfig.sortKey,
        reverse: sortConfig.reverse,
        selectedFilters: activeFilterInputs,
      }),
    placeholderData: keepPreviousData,
  });

  const products: ProductNode[] = data?.products || [];
  const availableFilters = data?.filters || [];
  const hasNextPage = data?.hasNextPage;
  const nextCursor = data?.nextCursor;

  const handleNext = () => {
    if (hasNextPage && nextCursor) {
      if (pageIndex + 1 >= cursorHistory.length) {
        setCursorHistory((prev) => [...prev, nextCursor]);
      }
      setPageIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
    }
  };

  const handlePrevious = () => {
    setPageIndex((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const getSelectedVariant = (product: ProductNode) => {
    const variants = product.variants?.edges.map((edge) => edge.node) || [];
    const selectedVariantId = selectedVariants[product.id];
    return (
      variants.find((variant) => variant.id === selectedVariantId) ||
      variants.find((variant) => variant.availableForSale) ||
      variants[0]
    );
  };

  const handleAddToCart = (product: ProductNode) => {
    const selectedVariant = getSelectedVariant(product);
    const isSelectedVariantAvailable = Boolean(selectedVariant?.availableForSale);
    if (!isSelectedVariantAvailable) return;
    const variantId = selectedVariant?.id || product.variants?.edges[0]?.node.id;
    const variantTitle = selectedVariant?.title && selectedVariant.title !== 'Default Title' ? selectedVariant.title : undefined;
    const price = selectedVariant?.priceV2 || product.priceRange.minVariantPrice;

    addToCart({
      id: variantId || product.id,
      title: product.title,
      variantTitle,
      handle: product.handle,
      price: {
        amount: price.amount,
        currencyCode: price.currencyCode,
      },
      featuredImage: product.featuredImage,
      variantId: variantId,
      productId: product.id,
    });
  };

  const handleVariantChange = (productId: string, variantId: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [productId]: variantId,
    }));
  };

  const resetPagination = () => {
    setCursorHistory([null]);
    setPageIndex(0);
  };

  const cloneFiltersState = (filters: SelectedFiltersState): SelectedFiltersState =>
    Object.fromEntries(Object.entries(filters).map(([key, values]) => [key, [...values]]));

  const normalizeFiltersState = (filters: SelectedFiltersState): SelectedFiltersState =>
    Object.fromEntries(
      Object.entries(filters).filter(([, values]) => Array.isArray(values) && values.length > 0)
    );

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      setDraftSort(selectedSort);
      setDraftFilters(cloneFiltersState(selectedFilters));
    }
    setIsFilterDialogOpen(open);
  };

  const toggleDraftFilter = (filterId: string, inputValue: string) => {
    setDraftFilters((prev) => {
      const currentValues = prev[filterId] || [];
      const hasValue = currentValues.includes(inputValue);
      const nextValues = hasValue
        ? currentValues.filter((value) => value !== inputValue)
        : [...currentValues, inputValue];
      return {
        ...prev,
        [filterId]: nextValues,
      };
    });
  };

  const applyDraftChanges = () => {
    setSelectedSort(draftSort);
    setSelectedFilters(normalizeFiltersState(draftFilters));
    resetPagination();
  };

  const clearAppliedFilters = () => {
    setSelectedFilters({});
    resetPagination();
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedSort !== "FEATURED") {
      params.set("sort", selectedSort);
    }
    const normalized = normalizeFilterInputs(activeFilterInputs);
    normalized.availability.forEach((value) => params.append("availability", value));
    normalized.productTypes.forEach((value) => params.append("productType", value));
    normalized.vendors.forEach((value) => params.append("vendor", value));
    normalized.tags.forEach((value) => params.append("tag", value));
    normalized.prices.forEach((value) => params.append("price", value));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [activeFilterInputs, pathname, router, selectedSort]);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">All Products</h1>
          <p className="text-muted-foreground">Viewing Page {pageIndex + 1}</p>
        </div>

        <div className="mb-6 flex items-center justify-between gap-3">
          <Button onClick={() => handleDialogOpenChange(true)}>
            Filter & Sort
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
          {activeFilterCount > 0 ? (
            <Button variant="outline" onClick={clearAppliedFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>

        <Dialog open={isFilterDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Filter and Sort Products</DialogTitle>
              <DialogDescription>
                Choose multiple filters and one sort order.
              </DialogDescription>
            </DialogHeader>

            <div className="grid max-h-[60vh] gap-6 overflow-y-auto md:grid-cols-[1.4fr_1fr]">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Filters
                </h3>
                {availableFilters
                  .filter((filter) => filter.values?.length > 0)
                  .map((filter) => (
                    <details
                      key={filter.id}
                      className="rounded-md border border-border bg-background"
                      open
                    >
                      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                        {filter.label}
                      </summary>
                      <div className="space-y-2 px-4 pb-4">
                        {filter.values.map((value) => {
                          const id = `${filter.id}-${value.id}`;
                          const checked = (draftFilters[filter.id] || []).includes(value.input);
                          return (
                            <label key={id} htmlFor={id} className="flex items-center gap-2 text-sm">
                              <input
                                id={id}
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleDraftFilter(filter.id, value.input)}
                              />
                              <span>
                                {value.label} ({value.count})
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </details>
                  ))}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Sort
                </h3>
                <div className="space-y-2 rounded-md border border-border p-4">
                  {SORT_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="sort-option"
                        checked={draftSort === option.value}
                        onChange={() => setDraftSort(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDraftSort("FEATURED");
                  setDraftFilters({});
                }}
              >
                Reset
              </Button>
              <Button
                onClick={() => {
                  applyDraftChanges();
                  setIsFilterDialogOpen(false);
                }}
              >
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${isPlaceholderData ? 'opacity-50' : 'opacity-100'}`}>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-80 w-full bg-muted animate-pulse rounded-lg" />
            ))
          ) : (
            products.map(product => {
              const variants = product.variants?.edges.map((edge) => edge.node) || [];
              const selectedVariant = getSelectedVariant(product);
              const isSelectedVariantAvailable = Boolean(selectedVariant?.availableForSale);
              const selectedPrice = selectedVariant?.priceV2 || product.priceRange.minVariantPrice;
              const productHref = selectedVariant
                ? `/products/${product.handle}?variant=${encodeURIComponent(getVariantUrlToken(selectedVariant.id))}`
                : `/products/${product.handle}`;

              return (
              <Card key={product.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                <Link href={productHref} className="block flex-1">
                  <div className="aspect-square relative">
                    <Image
                      src={product.featuredImage?.url || '/placeholder.png'}
                      alt={product.title}
                      fill
                      unoptimized={isAnimatedImage(product.featuredImage?.url)}
                      className="object-contain"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-md line-clamp-1">{product.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground line-clamp-2">
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
                    <Badge> {selectedPrice.currencyCode} {selectedPrice.amount}</Badge>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    disabled={!isSelectedVariantAvailable}
                    className='cursor-pointer'
                  >
                    {isSelectedVariantAvailable ? 'Add to Cart' : 'Out of stock'}
                  </Button>
                  </div>
                </CardFooter>
              </Card>
              );
            })
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
