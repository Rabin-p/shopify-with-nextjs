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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductNode } from "@/types/productTypes";
import { useCartStore } from "@/lib/cartStore";
import { isAnimatedImage } from "@/lib/isAnimatedImage";

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
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button asChild variant="outline" className="cursor-pointer">
            <Link href="/products/all">Back to products</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square relative rounded-lg overflow-hidden border">
            <Image
              src={product.featuredImage?.url || "/placeholder.png"}
              alt={product.title}
              fill
              unoptimized={isAnimatedImage(product.featuredImage?.url)}
              className="object-contain"
            />
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold">{product.title}</h1>
            <Badge className="text-sm px-3 py-1">
              {selectedPrice?.currencyCode} {selectedPrice?.amount}
            </Badge>
            {variants.length > 1 && (
              <div className="space-y-2">
                <label htmlFor="variant-select" className="text-sm font-medium">
                  Variant
                </label>
                <select
                  id="variant-select"
                  value={
                    selectedVariant
                      ? getVariantUrlToken(selectedVariant.id)
                      : ""
                  }
                  onChange={(e) => updateVariantInUrl(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {variants.map((variant) => (
                    <option
                      key={variant.id}
                      value={getVariantUrlToken(variant.id)}
                    >
                      {variant.title} - {variant.priceV2.currencyCode}{" "}
                      {variant.priceV2.amount}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="text-muted-foreground leading-relaxed">
              {product.description}
            </p>
            <Button
              onClick={handleAddToCart}
              className="w-full md:w-auto cursor-pointer"
              size="lg"
              disabled={!isSelectedVariantAvailable}
            >
              {isSelectedVariantAvailable ? "Add to Cart" : "Out of stock"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
