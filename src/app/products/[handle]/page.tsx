"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Heart, ChevronLeft, Star, ShoppingBag, ShieldCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductNode } from "@/types/productTypes";
import { useCartStore } from "@/lib/cartStore";
import { isAnimatedImage } from "@/lib/isAnimatedImage";
import { useLocalWishlist } from "@/lib/wishlistLocal";

type ProductDetailsResponse = {
  success: boolean;
  product?: ProductNode;
  message?: string;
};

const getVariantUrlToken = (variantId: string) =>
  variantId.split("/").pop() || variantId;

const fetchProductByHandle = async (
  handle: string,
): Promise<ProductDetailsResponse> => {
  const res = await fetch(`/api/products/${encodeURIComponent(handle)}`);

  if (!res.ok) {
    const errorData = (await res
      .json()
      .catch(() => ({}))) as ProductDetailsResponse;
    throw new Error(errorData.message || "Failed to fetch product");
  }

  return res.json();
};

export default function ProductDetailsPage() {
  const params = useParams<{ handle: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const handle = params?.handle || "";
  const { addToCart } = useCartStore();
  const { isWishlisted, toggle: toggleWishlist } = useLocalWishlist();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["product", handle],
    queryFn: () => fetchProductByHandle(handle),
    enabled: Boolean(handle),
  });

  const product = data?.product;
  const variants = useMemo(
    () => product?.variants?.edges.map((edge) => edge.node) || [],
    [product],
  );
  const variantFromUrl = searchParams.get("variant") || "";
  const firstAvailableVariant = variants.find(
    (variant) => variant.availableForSale,
  );
  const selectedVariant =
    variants.find(
      (variant) =>
        variant.id === variantFromUrl ||
        getVariantUrlToken(variant.id) === variantFromUrl,
    ) ||
    firstAvailableVariant ||
    variants[0];
  const selectedPrice =
    selectedVariant?.priceV2 || product?.priceRange.minVariantPrice;
  const isSelectedVariantAvailable = Boolean(selectedVariant?.availableForSale);
  const productIsWishlisted = product ? isWishlisted(product.id) : false;

  const updateVariantInUrl = useCallback(
    (variantId: string) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("variant", getVariantUrlToken(variantId));
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (!product || variants.length === 0) return;
    if (
      variantFromUrl &&
      variants.some(
        (variant) =>
          variant.id === variantFromUrl ||
          getVariantUrlToken(variant.id) === variantFromUrl,
      )
    ) {
      return;
    }
    updateVariantInUrl((firstAvailableVariant || variants[0]).id);
  }, [
    product,
    variantFromUrl,
    variants,
    firstAvailableVariant,
    updateVariantInUrl,
  ]);

  const handleOptionChange = useCallback((optionName: string, optionValue: string) => {
    if (!product || !selectedVariant) return;
    
    const isAlreadySelected = selectedVariant.selectedOptions?.some((opt) => opt.name === optionName && opt.value === optionValue);
    if (isAlreadySelected) return;

    const currentOptionsMap = new Map<string, string>();
    if (selectedVariant.selectedOptions) {
      selectedVariant.selectedOptions.forEach((opt) => currentOptionsMap.set(opt.name, opt.value));
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
      updateVariantInUrl(newVariant.id);
    }
  }, [product, selectedVariant, variants, updateVariantInUrl]);

  const handleAddToCart = () => {
    if (!product || !isSelectedVariantAvailable) return;
    const variantId =
      selectedVariant?.id || product.variants?.edges[0]?.node.id;
    const variantTitle =
      selectedVariant?.title && selectedVariant.title !== "Default Title"
        ? selectedVariant.title
        : undefined;
    const price =
      selectedVariant?.priceV2 || product.priceRange.minVariantPrice;

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            <div className="aspect-4/5 w-full bg-muted/60 animate-pulse rounded-3xl border border-border/50" />
            <div className="space-y-8 py-4">
              <div className="space-y-4">
                <div className="h-4 w-24 bg-muted animate-pulse rounded-full" />
                <div className="h-10 w-3/4 bg-muted animate-pulse rounded-xl" />
                <div className="h-8 w-1/4 bg-muted animate-pulse rounded-lg" />
              </div>
              <div className="space-y-4">
                <div className="h-24 w-full bg-muted animate-pulse rounded-2xl" />
              </div>
              <div className="flex gap-4">
                <div className="h-14 flex-1 bg-muted animate-pulse rounded-full" />
                <div className="h-14 w-14 bg-muted animate-pulse rounded-full" />
              </div>
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
          <p className="text-destructive">
            {error instanceof Error ? error.message : "Product not found"}
          </p>
          <Button asChild variant="outline" className="cursor-pointer">
            <Link href="/products/all">Back to products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Navigation / Breadcrumbs */}
        <nav className="mb-10 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Link href="/products/all" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            All Products
          </Link>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span className="text-foreground line-clamp-1">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Image Section */}
          <div className="relative aspect-4/5 rounded-[2.5rem] overflow-hidden bg-muted/20 border border-border/40 shadow-sm transition-all duration-700 hover:shadow-2xl hover:border-border/80 group">
            <Image
              src={product.featuredImage?.url || "/placeholder.png"}
              alt={product.title}
              fill
              priority
              unoptimized={isAnimatedImage(product.featuredImage?.url)}
              className="object-cover transition-transform duration-1000 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            
            <Badge variant="secondary" className="absolute top-6 left-6 rounded-full bg-white/90 backdrop-blur-md px-4 py-1.5 text-xs font-bold shadow-sm border-none">
              In Stock
            </Badge>
          </div>

          {/* Details Section */}
          <div className="flex flex-col h-full py-4">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <span className="text-xs font-semibold text-muted-foreground">4.9 (124 reviews)</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
              {product.title}
            </h1>

            <div className="flex items-baseline gap-4 mb-8">
              <span className="text-3xl font-bold text-primary">
                {selectedPrice?.currencyCode === 'USD' ? '$' : selectedPrice?.currencyCode}{' '}
                {parseFloat(selectedPrice?.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {parseFloat(selectedPrice?.amount || '0') > 100 && (
                <span className="text-sm text-muted-foreground line-through opacity-60">
                  {selectedPrice?.currencyCode} {(parseFloat(selectedPrice?.amount || '0') * 1.2).toFixed(2)}
                </span>
              )}
            </div>

            <div className="h-px w-full bg-border/60 mb-8" />

            {/* Options Selector */}
            {variants.length > 1 && product.options && product.options.length > 0 && (
              <div className="space-y-8 mb-10">
                {product.options.map((option) => {
                  if (option.name === 'Title' && option.values.includes('Default Title')) return null;
                  return (
                    <div key={option.name}>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{option.name}</span>
                        <span className="text-xs font-medium text-primary underline decoration-primary/30 underline-offset-4 cursor-pointer hover:text-primary/80">Size Guide</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {option.values.map(val => {
                          const isSelected = selectedVariant?.selectedOptions?.find(
                            (so) => so.name === option.name && so.value === val
                          ) !== undefined;

                          return (
                            <button
                              key={val}
                              onClick={() => handleOptionChange(option.name, val)}
                              className={`min-w-14 h-12 px-5 text-sm font-semibold rounded-2xl border transition-all duration-300 ${
                                isSelected 
                                  ? 'bg-foreground text-background border-foreground shadow-lg scale-105' 
                                  : 'bg-background hover:border-foreground/40 text-foreground border-border/80'
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
            )}



            {/* CTA Section */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Button
                onClick={handleAddToCart}
                className="h-16 flex-1 rounded-full text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 gap-3"
                size="lg"
                disabled={!isSelectedVariantAvailable}
              >
                <ShoppingBag className="h-5 w-5" />
                {isSelectedVariantAvailable ? "Add to Cart" : "Currently Unavailable"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={`h-16 w-16 rounded-full border-border/80 transition-all hover:scale-105 active:scale-95 ${
                  productIsWishlisted ? "bg-rose-50 border-rose-200" : ""
                }`}
                onClick={() => {
                  if (!product) return;
                  toggleWishlist(product.id);
                }}
              >
                <Heart
                  className={`h-6 w-6 transition-colors ${
                    productIsWishlisted ? "fill-rose-500 text-rose-500" : "text-muted-foreground"
                  }`}
                />
              </Button>
            </div>

            {/* Value Props */}
            <div className="grid grid-cols-2 gap-4 pt-8 mt-auto border-t border-border/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">Free Shipping</p>
                  <p className="text-[10px] text-muted-foreground">On all orders over $150</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">Secure Payment</p>
                  <p className="text-[10px] text-muted-foreground">100% encrypted checkout</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Extended Product Info */}
        <div className="mt-16 sm:mt-24 w-full">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Product Details
            </div>
            
            <div className="space-y-6">
              <h2 className="text-3xl font-extrabold tracking-tight">Experience the excellence</h2>
              <div className="prose prose-xl prose-neutral dark:prose-invert max-w-none">
                <p className="text-xl text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            </div>

            {/* Additional Decorative Details if needed */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-12 border-t border-border/40">
              <div className="space-y-3">
                <p className="font-bold text-sm uppercase tracking-wider text-primary">Material</p>
                <p className="text-muted-foreground text-sm leading-relaxed">Sourced from the finest global materials, ensuring durability and a premium hand-feel.</p>
              </div>
              <div className="space-y-3">
                <p className="font-bold text-sm uppercase tracking-wider text-primary">Care</p>
                <p className="text-muted-foreground text-sm leading-relaxed">Hand wash or delicate machine cycle. Please avoid harsh chemicals to preserve life.</p>
              </div>
              <div className="space-y-3">
                <p className="font-bold text-sm uppercase tracking-wider text-primary">Sustainability</p>
                <p className="text-muted-foreground text-sm leading-relaxed">Ethically produced in carbon-neutral facilities with 100% recyclable packaging.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
