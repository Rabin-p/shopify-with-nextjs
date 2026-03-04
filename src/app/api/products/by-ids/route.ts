import { NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify';
import type { ProductNode } from '@/types/productTypes';

type ProductsByIdsRequest = {
  ids?: string[];
};

type ProductsByIdsResponse = {
  nodes: Array<ProductNode | null>;
};

const PRODUCTS_BY_IDS_QUERY = `
  query ProductsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        handle
        description
        availableForSale
        featuredImage {
          url
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

function normalizeProductIds(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];

  return [...new Set(value)]
    .filter(
      (id): id is string =>
        typeof id === 'string' && id.includes('gid://shopify/Product/')
    )
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProductsByIdsRequest;
    const ids = normalizeProductIds(body.ids);

    if (ids.length === 0) {
      return NextResponse.json({ success: true, products: [] });
    }

    const data = await shopifyFetch<ProductsByIdsResponse>({
      query: PRODUCTS_BY_IDS_QUERY,
      variables: { ids },
    });

    const products = data.nodes.filter((node): node is ProductNode =>
      Boolean(node && node.id && node.handle)
    );

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error('Failed to load products by IDs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load products.' },
      { status: 500 }
    );
  }
}
