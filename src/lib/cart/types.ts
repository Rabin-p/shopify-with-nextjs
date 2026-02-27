export type CartLineInput = {
  merchandiseId: string;
  quantity: number;
};

export type ShopifyCartLineNode = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    priceV2: {
      amount: string;
      currencyCode: string;
    };
    product: {
      handle: string;
      title: string;
    };
    image: {
      url: string;
    } | null;
  } | null;
};

export type ShopifyCart = {
  id: string;
  checkoutUrl: string;
  lines: {
    edges: Array<{
      node: ShopifyCartLineNode;
    }>;
  };
};
