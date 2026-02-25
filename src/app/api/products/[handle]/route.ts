import { NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";
import { ProductNode } from "@/types/productTypes";

const PRODUCT_BY_HANDLE_QUERY = `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      description
      featuredImage {
        url
      }
      variants(first: 1) {
        edges {
          node {
            id
            title
            priceV2 {
              amount
              currencyCode
            }
          }
        }
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
    }
  }
`;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle: rawHandle } = await params;
    const handle = decodeURIComponent(rawHandle || "").trim();

    if (!handle) {
      return NextResponse.json(
        { success: false, message: "Product handle is required" },
        { status: 400 }
      );
    }

    const data: { product: ProductNode | null } = await shopifyFetch({
      query: PRODUCT_BY_HANDLE_QUERY,
      variables: { handle },
    });

    if (!data.product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product: data.product,
    });
  } catch (error) {
    console.error("Product details route error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch product details" },
      { status: 500 }
    );
  }
}
