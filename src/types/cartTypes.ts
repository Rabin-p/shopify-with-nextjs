export interface CartItem {
  id: string;
  title: string;
  handle: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  featuredImage?: {
    url: string;
  };
  quantity: number;
  variantId?: string;
  productId?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}
