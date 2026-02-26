import { NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify';
import type {
  FallbackFiltersQueryResponse,
  FallbackProductsQueryResponse,
  ProductFilterDefinition,
  ProductFilterInput,
  ProductsQueryResponse,
} from '@/types/productFilterTypes';

const PRODUCTS_QUERY = `
  query GetProducts(
    $cursor: String
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $filters: [ProductFilter!]
  ) {
    collection(handle: "all") {
      products(
        first: 20
        after: $cursor
        sortKey: $sortKey
        reverse: $reverse
        filters: $filters
      ) {
        edges {
          node {
            id
            title
            handle
            description
            availableForSale
            featuredImage {
              url
            }
            variants(first: 50) {
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
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const PRODUCTS_FALLBACK_QUERY = `
  query GetProductsFallback(
    $cursor: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $query: String
  ) {
    products(
      first: 20
      after: $cursor
      sortKey: $sortKey
      reverse: $reverse
      query: $query
    ) {
      edges {
        node {
          id
          title
          handle
          description
          productType
          vendor
          tags
          availableForSale
          featuredImage {
            url
          }
          variants(first: 50) {
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
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const PRODUCTS_FALLBACK_FILTERS_QUERY = `
  query GetProductsFallbackFilters {
    products(first: 250) {
      edges {
        node {
          productType
          vendor
          tags
          availableForSale
        }
      }
    }
  }
`;

const parseFilters = (searchParams: URLSearchParams) => {
  const parsedFilters: ProductFilterInput[] = [];
  const legacyFilterParams = searchParams.getAll('filter');

  for (const filterParam of legacyFilterParams) {
    try {
      const parsed = JSON.parse(filterParam) as ProductFilterInput;
      if (parsed && typeof parsed === 'object') {
        parsedFilters.push(parsed);
      }
    } catch {
      return null;
    }
  }

  for (const value of searchParams.getAll('availability')) {
    if (value === 'true' || value === 'false') {
      parsedFilters.push({ available: value === 'true' });
    } else {
      return null;
    }
  }

  for (const value of searchParams.getAll('productType')) {
    if (value) parsedFilters.push({ productType: value });
  }

  for (const value of searchParams.getAll('vendor')) {
    if (value) parsedFilters.push({ productVendor: value });
  }

  for (const value of searchParams.getAll('tag')) {
    if (value) parsedFilters.push({ tag: value });
  }

  for (const value of searchParams.getAll('price')) {
    const [rawMin, rawMax] = value.split(':');
    const min = rawMin ? Number(rawMin) : undefined;
    const max = rawMax ? Number(rawMax) : undefined;

    if (
      (rawMin && Number.isNaN(min)) ||
      (rawMax && Number.isNaN(max)) ||
      (min === undefined && max === undefined)
    ) {
      return null;
    }

    parsedFilters.push({
      price: {
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
      },
    });
  }

  return parsedFilters;
};

const mapCollectionSortKeyToProductSortKey = (sortKey: string) => {
  switch (sortKey) {
    case 'BEST_SELLING':
      return 'BEST_SELLING';
    case 'PRICE':
      return 'PRICE';
    case 'TITLE':
      return 'TITLE';
    case 'CREATED':
      return 'CREATED_AT';
    default:
      return undefined;
  }
};

const buildFallbackSearchQuery = (filters: ProductFilterInput[]) => {
  const productTypes = new Set<string>();
  const productVendors = new Set<string>();
  const tags = new Set<string>();
  const availability = new Set<'true' | 'false'>();
  const priceRanges: Array<{ min?: number; max?: number }> = [];

  for (const filter of filters) {
    if (typeof filter.available === 'boolean') {
      availability.add(filter.available ? 'true' : 'false');
    }
    if (filter.productType) {
      productTypes.add(filter.productType);
    }
    if (filter.productVendor) {
      productVendors.add(filter.productVendor);
    }
    if (filter.tag) {
      tags.add(filter.tag);
    }
    if (
      filter.price &&
      (filter.price.min !== undefined || filter.price.max !== undefined)
    ) {
      priceRanges.push(filter.price);
    }
  }

  const toOrExpression = (field: string, values: string[]) => {
    if (values.length === 1) {
      return `${field}:${JSON.stringify(values[0])}`;
    }
    return `(${values.map((value) => `${field}:${JSON.stringify(value)}`).join(' OR ')})`;
  };

  const queryParts: string[] = [];

  if (availability.size === 1) {
    queryParts.push(`available_for_sale:${[...availability][0]}`);
  }
  if (productTypes.size > 0) {
    queryParts.push(toOrExpression('product_type', [...productTypes]));
  }
  if (productVendors.size > 0) {
    queryParts.push(toOrExpression('vendor', [...productVendors]));
  }
  if (tags.size > 0) {
    queryParts.push(toOrExpression('tag', [...tags]));
  }
  if (priceRanges.length > 0) {
    const priceExpressions = priceRanges.map((range) => {
      const parts: string[] = [];
      if (range.min !== undefined) {
        parts.push(`variants.price:>=${range.min}`);
      }
      if (range.max !== undefined) {
        parts.push(`variants.price:<=${range.max}`);
      }
      return parts.length > 1 ? `(${parts.join(' AND ')})` : parts[0];
    });
    if (priceExpressions.length === 1) {
      queryParts.push(priceExpressions[0]);
    } else {
      queryParts.push(`(${priceExpressions.join(' OR ')})`);
    }
  }

  return queryParts.join(' ');
};

const getFilterGroupKey = (filter: ProductFilterInput) => {
  if (typeof filter.available === 'boolean') return 'available';
  if (filter.productType) return 'productType';
  if (filter.productVendor) return 'productVendor';
  if (filter.tag) return 'tag';
  if (filter.price) return 'price';
  return 'unknown';
};

const buildFallbackFilterDefinitions = (
  data: FallbackFiltersQueryResponse
): ProductFilterDefinition[] => {
  const productTypeCounts = new Map<string, number>();
  const vendorCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  let inStockCount = 0;

  for (const edge of data.products.edges) {
    const node = edge.node;

    if (node.availableForSale) {
      inStockCount += 1;
    }

    if (node.productType) {
      productTypeCounts.set(
        node.productType,
        (productTypeCounts.get(node.productType) ?? 0) + 1
      );
    }

    if (node.vendor) {
      vendorCounts.set(node.vendor, (vendorCounts.get(node.vendor) ?? 0) + 1);
    }

    for (const tag of node.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const toValues = (
    counts: Map<string, number>,
    inputKey: keyof ProductFilterInput
  ) =>
    [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({
        id: value,
        label: value,
        count,
        input: JSON.stringify({ [inputKey]: value }),
      }));

  const filters: ProductFilterDefinition[] = [];

  if (inStockCount > 0) {
    filters.push({
      id: 'filter.v.availability',
      label: 'Availability',
      type: 'LIST',
      values: [
        {
          id: 'available',
          label: 'In stock',
          count: inStockCount,
          input: JSON.stringify({ available: true }),
        },
      ],
    });
  }

  const productTypeValues = toValues(productTypeCounts, 'productType');
  if (productTypeValues.length > 0) {
    filters.push({
      id: 'filter.p.product_type',
      label: 'Product type',
      type: 'LIST',
      values: productTypeValues,
    });
  }

  const vendorValues = toValues(vendorCounts, 'productVendor');
  if (vendorValues.length > 0) {
    filters.push({
      id: 'filter.p.vendor',
      label: 'Vendor',
      type: 'LIST',
      values: vendorValues,
    });
  }

  const tagValues = toValues(tagCounts, 'tag');
  if (tagValues.length > 0) {
    filters.push({
      id: 'filter.p.tag',
      label: 'Tag',
      type: 'LIST',
      values: tagValues,
    });
  }

  return filters;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const cursor = url.searchParams.get('cursor') || null;
    const sortKey = url.searchParams.get('sortKey') || 'COLLECTION_DEFAULT';
    const reverse = url.searchParams.get('reverse') === 'true';
    const filters = parseFilters(url.searchParams);

    if (filters === null) {
      return NextResponse.json(
        { success: false, message: 'Invalid filter format.' },
        { status: 400 }
      );
    }

    const filterGroupCounts = new Map<string, number>();
    for (const filter of filters) {
      const groupKey = getFilterGroupKey(filter);
      filterGroupCounts.set(
        groupKey,
        (filterGroupCounts.get(groupKey) ?? 0) + 1
      );
    }
    const hasMultiSelectWithinSameGroup = [...filterGroupCounts.values()].some(
      (count) => count > 1
    );

    const data = hasMultiSelectWithinSameGroup
      ? null
      : await shopifyFetch<ProductsQueryResponse>({
          query: PRODUCTS_QUERY,
          variables: {
            cursor,
            sortKey,
            reverse,
            filters: filters.length > 0 ? filters : undefined,
          },
        });

    if (data?.collection?.products?.edges) {
      const products = data.collection.products.edges.map((edge) => edge.node);

      return NextResponse.json({
        success: true,
        products,
        filters: data.collection.products.filters,
        nextCursor: data.collection.products.pageInfo.endCursor,
        hasNextPage: data.collection.products.pageInfo.hasNextPage,
      });
    }

    // Some stores do not expose an "all" collection handle; fallback to root products.
    const fallbackData = await shopifyFetch<FallbackProductsQueryResponse>({
      query: PRODUCTS_FALLBACK_QUERY,
      variables: {
        cursor,
        sortKey: mapCollectionSortKeyToProductSortKey(sortKey),
        reverse,
        query:
          filters.length > 0 ? buildFallbackSearchQuery(filters) : undefined,
      },
    });

    if (!fallbackData?.products?.edges) {
      console.error(
        'Invalid fallback products response structure from Shopify API'
      );
      return NextResponse.json(
        { success: false, message: 'Invalid response from Shopify' },
        { status: 500 }
      );
    }

    const products = fallbackData.products.edges.map((edge) => edge.node);
    const fallbackFiltersData =
      await shopifyFetch<FallbackFiltersQueryResponse>({
        query: PRODUCTS_FALLBACK_FILTERS_QUERY,
      });

    return NextResponse.json({
      success: true,
      products,
      filters: buildFallbackFilterDefinitions(fallbackFiltersData),
      nextCursor: fallbackData.products.pageInfo.endCursor,
      hasNextPage: fallbackData.products.pageInfo.hasNextPage,
    });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
