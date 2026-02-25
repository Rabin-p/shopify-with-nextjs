export interface ProductNode {
  id: string;
  title: string;
  handle: string;
  description: string;
  featuredImage?: {
    url: string;
  };
  variants?: {
    edges: {
      node: {
        id: string;
        title: string;
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
};