import { NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";
import { ProductNode } from "@/types/productTypes";

const PRODUCTS_QUERY = `
  query GetProducts($cursor: String) {
    products(first: 20, after: $cursor) {
      edges {
        node {
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
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor") || null; // accept cursor from client

    const data: {
      products: {
        edges: { node: ProductNode }[];
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    } = await shopifyFetch({
      query: PRODUCTS_QUERY,
      variables: { cursor },
    });

    if (!data || !data.products || !data.products.edges) {
      console.error('Invalid products response structure from Shopify API');
      return NextResponse.json(
        { success: false, message: "Invalid response from Shopify" },
        { status: 500 }
      );
    }

    const products = data.products.edges.map(edge => edge.node);

    return NextResponse.json({
      success: true,
      products,
      nextCursor: data.products.pageInfo.endCursor,
      hasNextPage: data.products.pageInfo.hasNextPage,
    });
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products" },
      { status: 500 }
    );
  }
}