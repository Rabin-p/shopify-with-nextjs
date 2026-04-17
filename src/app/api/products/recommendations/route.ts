import { NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify';

const RECOMMENDATIONS_QUERY = `
  query ProductRecommendations($productId: ID!) {
    productRecommendations(productId: $productId, intent: RELATED) {
      id
      title
      handle
      availableForSale
      featuredImage {
        url
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 1) {
        edges {
          node {
            id
            title
            availableForSale
            priceV2 {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ success: false, message: 'Missing productId' }, { status: 400 });
    }

    const data = await shopifyFetch<any>({
      query: RECOMMENDATIONS_QUERY,
      variables: {
        productId,
      },
    });

    return NextResponse.json({
      success: true,
      recommendations: data.productRecommendations || [],
    });
  } catch (error) {
    console.error('Recommendations API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch product recommendations',
      },
      { status: 500 }
    );
  }
}
