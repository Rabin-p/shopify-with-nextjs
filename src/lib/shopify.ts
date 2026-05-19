import { createStorefrontApiClient } from '@shopify/storefront-api-client';

const storeDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const publicAccessToken =
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const privateAccessToken =
  process.env.NEXT_PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

if (!storeDomain) {
  throw new Error('Missing NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN');
}

if (!publicAccessToken) {
  throw new Error('Missing NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN');
}

// Public client for reading products
export const publicShopifyClient = createStorefrontApiClient({
  storeDomain,
  apiVersion: '2026-01',
  publicAccessToken,
});

// Private client for cart operations
export const privateShopifyClient = createStorefrontApiClient({
  storeDomain,
  apiVersion: '2026-01',
  ...(privateAccessToken ? { privateAccessToken } : { publicAccessToken }),
});

// Default client for general use (uses public token)
export const shopifyClient = publicShopifyClient;

interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export async function shopifyFetch<T>({
  query,
  variables = {},
}: {
  query: string;
  variables?: Record<string, unknown>;
}): Promise<T> {
  try {
    // Use the default (public) client for general operations
    const response = await shopifyClient.request(query, {
      variables,
    });

    if (response && typeof response === 'object' && 'errors' in response) {
      const errorValue = (
        response as { errors?: GraphQLError[] | { message?: string } }
      ).errors;
      const errorMessage = Array.isArray(errorValue)
        ? errorValue[0]?.message
        : errorValue?.message;
      if (errorMessage) {
        throw new Error(`Shopify API Error: ${errorMessage}`);
      }
    }

    //Shopify client returns data wrapped in a 'data' property
    const unwrappedResponse = (response as { data?: T }).data;

    if (!unwrappedResponse) {
      throw new Error('No data returned from Shopify API');
    }

    // Return the unwrapped response as the expected type T
    return unwrappedResponse as T;
  } catch (error) {
    console.error('Shopify fetch error:', error);
    throw error;
  }
}

// Specialized fetch function for checkout operations using private client
export async function shopifyCheckoutFetch<T>({
  query,
  variables = {},
}: {
  query: string;
  variables?: Record<string, unknown>;
}): Promise<T> {
  try {
    // Use the private client for checkout operations
    const response = await privateShopifyClient.request(query, {
      variables,
    });

    if (response && typeof response === 'object' && 'errors' in response) {
      const errorValue = (
        response as { errors?: GraphQLError[] | { message?: string } }
      ).errors;
      const errorMessage = Array.isArray(errorValue)
        ? errorValue[0]?.message
        : errorValue?.message;
      if (errorMessage) {
        throw new Error(`Shopify API Error: ${errorMessage}`);
      }
    }

    // The Shopify client returns data wrapped in a 'data' property
    const unwrappedResponse = (response as { data?: T }).data;

    if (!unwrappedResponse) {
      throw new Error('No data returned from Shopify Checkout API');
    }

    // Return the unwrapped response as the expected type T
    return unwrappedResponse as T;
  } catch (error) {
    console.error('Shopify checkout fetch error:', error);
    throw error;
  }
}

// Admin API fetch function (requires Shopify Admin Access Token with Metaobject read/write scopes)
export async function adminShopifyFetch<T>({
  query,
  variables = {},
}: {
  query: string;
  variables?: Record<string, unknown>;
}): Promise<T> {
  const adminToken = process.env.NEXT_APP_ACCESS_TOKEN || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.NEXT_PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  
  if (!adminToken) {
    throw new Error('Missing Admin API access token.');
  }

  try {
    const response = await fetch(`https://${storeDomain}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': adminToken,
      },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store', // Avoid caching for mutation-heavy routes
    });

    const result = await response.json();

    if (result.errors) {
      const errorMessage = result.errors[0]?.message || 'Admin API Error';
      throw new Error(`Shopify Admin API Error: ${errorMessage}`);
    }

    if (!result.data) {
      throw new Error('No data returned from Shopify Admin API');
    }

    return result.data as T;
  } catch (error) {
    console.error('Shopify Admin API fetch error:', error);
    throw error;
  }
}
