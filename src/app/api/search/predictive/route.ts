import { NextResponse } from "next/server";

import { shopifyFetch } from "@/lib/shopify";

interface PredictiveProduct {
  id: string;
  title: string;
  handle: string;
  featuredImage?: {
    url: string;
    altText?: string | null;
  } | null;
  priceRange?: {
    minVariantPrice?: {
      amount: string;
      currencyCode: string;
    };
  };
}

interface PredictiveSearchResponse {
  predictiveSearch: {
    products: PredictiveProduct[];
  };
}

const PREDICTIVE_SEARCH_QUERY = `
  query PredictiveSearch($query: String!, $limit: Int!) {
    predictiveSearch(
      query: $query
      limit: $limit
      types: [PRODUCT]
      unavailableProducts: HIDE
    ) {
      products {
        id
        title
        handle
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q")?.trim() ?? "";

    if (query.length < 2) {
      return NextResponse.json({ success: true, products: [] });
    }

    const data = await shopifyFetch<PredictiveSearchResponse>({
      query: PREDICTIVE_SEARCH_QUERY,
      variables: {
        query,
        limit: 6,
      },
    });

    return NextResponse.json({
      success: true,
      products: data.predictiveSearch.products,
    });
  } catch (error) {
    console.error("Predictive search API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch predictive search results",
      },
      { status: 500 }
    );
  }
}
