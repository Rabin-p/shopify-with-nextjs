export interface ProductNode {
  id: string;
  title: string;
  handle: string;
  description: string;
  availableForSale: boolean;
  options?: {
    name: string;
    values: string[];
  }[];
  featuredImage?: {
    url: string;
  };
  variants?: {
    edges: {
      node: {
        id: string;
        title: string;
        availableForSale: boolean;
        selectedOptions?: {
          name: string;
          value: string;
        }[];
        priceV2: {
          amount: string;
          currencyCode: string;
        };
      };
    }[];
  };
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
}
