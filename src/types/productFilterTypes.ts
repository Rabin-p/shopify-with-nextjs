import type { ProductNode } from '@/types/productTypes';

export type ProductFilterValue = {
  id: string;
  label: string;
  count: number;
  input: string;
};

export type ProductFilterDefinition = {
  id: string;
  label: string;
  type: string;
  values: ProductFilterValue[];
};

export type ProductFilterInput = {
  available?: boolean;
  productType?: string;
  productVendor?: string;
  tag?: string;
  price?: {
    min?: number;
    max?: number;
  };
};

export type ProductsQueryResponse = {
  collection: {
    products: {
      edges: { node: ProductNode }[];
      filters: ProductFilterDefinition[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  } | null;
};

export type FallbackProductsQueryResponse = {
  products: {
    edges: { node: ProductNode }[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
};

export type FallbackFiltersQueryResponse = {
  products: {
    edges: {
      node: {
        productType: string | null;
        vendor: string;
        tags: string[];
        availableForSale: boolean;
      };
    }[];
  };
};

export type ShopifyFilterValue = ProductFilterValue;
export type ShopifyFilter = ProductFilterDefinition;

export type ProductsResponse = {
  products: ProductNode[];
  filters: ShopifyFilter[];
  hasNextPage: boolean;
  nextCursor: string | null;
};

export type SelectedFiltersState = Record<string, string[]>;
