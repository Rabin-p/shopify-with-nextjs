'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Heart, Loader2 } from 'lucide-react';
import type { ProductNode } from '@/types/productTypes';
import type {
  ProductFilterInput,
  ProductsResponse,
  SelectedFiltersState,
} from '@/types/productFilterTypes';

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

import { isAnimatedImage } from '@/lib/isAnimatedImage';
import { useLocalWishlist } from '@/lib/wishlistLocal';

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
  const [selectedSort, setSelectedSort] = useState<SortOptionValue>("FEATURED");
  const [selectedFilters, setSelectedFilters] = useState<SelectedFiltersState>({});
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [draftSort, setDraftSort] = useState<SortOptionValue>("FEATURED");
  const [draftFilters, setDraftFilters] = useState<SelectedFiltersState>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quickAddProduct, setQuickAddProduct] = useState<ProductNode | null>(null);
  const { addToCart } = useCartStore();

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

  const { 
    data, 
    isLoading, 
    isFetching, 
    isFetchingNextPage, 
    hasNextPage, 
    fetchNextPage,
    isError,
    error 
  } = useInfiniteQuery({
    queryKey: ['products', sortConfig.sortKey, sortConfig.reverse, activeFilterInputs],
    queryFn: ({ pageParam }) =>
      fetchProducts({
        cursor: pageParam as string | null,
        sortKey: sortConfig.sortKey,
        reverse: sortConfig.reverse,
        selectedFilters: activeFilterInputs,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.nextCursor : undefined,
  });

  const products: ProductNode[] = data?.pages.flatMap(page => page.products) || [];
  const { productIds: wishlistIds, toggle: toggleWishlist } = useLocalWishlist();
  const availableFilters = data?.pages[0]?.filters || [];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '800px' } // Fetch exactly when reaching one row above
    );

    const target = document.getElementById('infinite-scroll-trigger');
    if (target) observer.observe(target);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  const handleOptionChange = (productId: string, optionName: string, optionValue: string, product: ProductNode) => {
    const currentVariant = getSelectedVariant(product);
    const variants = product.variants?.edges.map((e) => e.node) || [];
    
    const isAlreadySelected = currentVariant?.selectedOptions?.some((opt) => opt.name === optionName && opt.value === optionValue);
    if (isAlreadySelected) return;

    const currentOptionsMap = new Map<string, string>();
    if (currentVariant?.selectedOptions) {
      currentVariant.selectedOptions.forEach((opt) => currentOptionsMap.set(opt.name, opt.value));
    }
    currentOptionsMap.set(optionName, optionValue);
    
    let newVariant = variants.find((v) => {
      const vOptions = v.selectedOptions || [];
      return vOptions.every((opt) => currentOptionsMap.get(opt.name) === opt.value);
    });
    
    if (!newVariant) {
      newVariant = variants.find((v) => {
        const vOptions = v.selectedOptions || [];
        const match = vOptions.find((opt) => opt.name === optionName && opt.value === optionValue);
        return !!match && v.availableForSale; 
      });
    }

    if (!newVariant) {
      newVariant = variants.find((v) => {
        const vOptions = v.selectedOptions || [];
        const match = vOptions.find((opt) => opt.name === optionName && opt.value === optionValue);
        return !!match;
      });
    }

    if (newVariant) {
      handleVariantChange(productId, newVariant.id);
    }
  };

  const clearAppliedFilters = () => {
    setSelectedFilters({});
  };

  const applyDraftChanges = () => {
    setSelectedSort(draftSort);
    setSelectedFilters(normalizeFiltersState(draftFilters));
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
        <div className="mb-12 mt-4 flex flex-col items-center text-center">
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Curated <span className="text-primary/80">Collection</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Discover our full range of premium products. Explore the finest selections tailored to your unique taste.
          </p>
        </div>

        <div className="mb-8 flex items-center justify-between gap-3 border-b pb-4">
          <Button 
            variant="outline" 
            className="rounded-full shadow-sm"
            onClick={() => handleDialogOpenChange(true)}
          >
            Filter & Sort
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
          {activeFilterCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={clearAppliedFilters}>
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

        <div className="relative min-h-[600px]">
          {/* Initial/Global Loading State */}
          {isFetching && products.length === 0 && !isError && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl transition-all duration-500 rounded-3xl border border-dashed border-border/60">
              <div className="relative flex flex-col items-center">
                 <div className="absolute inset-0 h-24 w-24 animate-ping rounded-full bg-primary/20 opacity-75" />
                 <Loader2 className="relative h-16 w-16 animate-spin text-primary" />
              </div>
              <h2 className="mt-8 text-2xl font-bold tracking-tight">Curating your selection</h2>
              <p className="mt-2 text-muted-foreground animate-pulse">This may take a moment while we fetch the latest products...</p>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background p-8 text-center rounded-3xl border border-destructive/20 border-dashed">
              <div className="mb-4 rounded-full bg-destructive/10 p-4">
                <Heart className="h-10 w-10 text-destructive rotate-45" />
              </div>
              <h3 className="text-xl font-bold">Something went wrong</h3>
              <p className="mt-2 text-muted-foreground max-w-md">
                {error instanceof Error ? error.message : "We couldn't load the collection right now. Please try refreshing or checking your connection."}
              </p>
              <Button onClick={() => window.location.reload()} variant="outline" className="mt-6 rounded-full px-8">
                Try Again
              </Button>
            </div>
          )}

          {/* Filter Loading Overlay (Subtle) */}
          {!isLoading && isFetching && !isFetchingNextPage && products.length > 0 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/30 backdrop-blur-[1px] transition-all duration-300 pointer-events-none">
              <div className="flex items-center gap-3 rounded-full bg-background/90 px-6 py-3 shadow-2xl border border-border/40 translate-y-[-20%]">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-bold tracking-tight uppercase">Updating...</span>
              </div>
            </div>
          )}

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-300 ${isLoading || (isFetching && !isFetchingNextPage) ? 'opacity-40' : 'opacity-100'}`}>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[480px] w-full bg-muted/60 animate-pulse rounded-2xl border border-border/50" />
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
              
              const hasMultipleOptions = variants.length > 1 && product.options && product.options.length > 0 && !product.options.every(opt => opt.name === 'Title' && opt.values.includes('Default Title'));

              return (
                <div key={product.id} className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-card transition-all duration-500 hover:shadow-2xl hover:border-border/80">
                  <Link href={productHref} className="block flex-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-t-2xl">
                    <div className="relative aspect-4/5 overflow-hidden bg-muted/20">
                      <Image
                        src={product.featuredImage?.url || '/placeholder.png'}
                        alt={product.title}
                        fill
                        unoptimized={isAnimatedImage(product.featuredImage?.url)}
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-3 top-3 z-10 h-10 w-10 rounded-full bg-white/90 shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-white"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleWishlist(product.id);
                        }}
                        aria-label={
                          wishlistIds.includes(product.id)
                            ? 'Remove from wishlist'
                            : 'Add to wishlist'
                        }
                      >
                        <Heart
                          className={`h-4 w-4 transition-colors ${wishlistIds.includes(product.id)
                              ? 'fill-rose-500 text-rose-500'
                              : 'text-zinc-600'
                            }`}
                        />
                      </Button>
                    </div>
                    
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-lg font-semibold tracking-tight line-clamp-1">{product.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                  </Link>
                  
                  <div className="mt-auto px-5 pb-5 flex flex-col gap-4">
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-foreground">
                        {selectedPrice.currencyCode === 'USD' ? '$' : selectedPrice.currencyCode}{' '}
                        {parseFloat(selectedPrice.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (hasMultipleOptions) {
                          setQuickAddProduct(product);
                        } else {
                          handleAddToCart(product);
                        }
                      }}
                      disabled={!hasMultipleOptions && !isSelectedVariantAvailable}
                      className="w-full rounded-full py-5 font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                    >
                      {hasMultipleOptions 
                        ? 'Choose Options' 
                        : isSelectedVariantAvailable ? 'Add to Cart' : 'Sold Out'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>

        {/* Infinite Scroll Trigger & UI */}
        <div id="infinite-scroll-trigger" className="mt-14 flex flex-col items-center justify-center p-4">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-foreground" />
              <span className="text-sm font-medium">Loading more products...</span>
            </div>
          ) : !hasNextPage && products.length > 0 ? (
            <div className="text-sm text-muted-foreground">End of the collection</div>
          ) : null}
        </div>
        {/* Quick Add Dialog */}
        <Dialog open={!!quickAddProduct} onOpenChange={(open) => !open && setQuickAddProduct(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{quickAddProduct?.title}</DialogTitle>
            </DialogHeader>
            {quickAddProduct && (() => {
               const variantOptions = quickAddProduct.options || [];
               const quickVariant = getSelectedVariant(quickAddProduct);
               const isQuickVariantAvailable = Boolean(quickVariant?.availableForSale);
               const quickPrice = quickVariant?.priceV2 || quickAddProduct.priceRange.minVariantPrice;

               return (
                 <div className="py-2">
                    <div className="mb-4">
                      {variantOptions.map((option) => {
                        if (option.name === 'Title' && option.values.includes('Default Title')) return null;
                        return (
                          <div key={option.name} className="mb-4 last:mb-0">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">{option.name}</span>
                            <div className="flex flex-wrap gap-2">
                              {option.values.map(val => {
                                const isSelected = quickVariant?.selectedOptions?.find(
                                  (so) => so.name === option.name && so.value === val
                                ) !== undefined;

                                return (
                                  <button
                                    key={val}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleOptionChange(quickAddProduct.id, option.name, val, quickAddProduct);
                                    }}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                                      isSelected 
                                        ? 'bg-foreground text-background border-foreground shadow-sm' 
                                        : 'bg-background hover:bg-muted text-foreground border-input/60'
                                    }`}
                                  >
                                    {val}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t">
                      <span className="text-xl font-bold text-foreground">
                        {quickPrice.currencyCode === 'USD' ? '$' : quickPrice.currencyCode}{' '}
                        {parseFloat(quickPrice.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          handleAddToCart(quickAddProduct);
                          setQuickAddProduct(null);
                        }}
                        disabled={!isQuickVariantAvailable}
                        className="rounded-full px-8 font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
                      >
                        {isQuickVariantAvailable ? 'Add to Cart' : 'Sold Out'}
                      </Button>
                    </div>
                 </div>
               );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
