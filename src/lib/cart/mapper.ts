import { Cart, CartItem } from '@/types/cartTypes';
import { ShopifyCart, ShopifyCartLineNode } from '@/lib/cart/types';

export function mapShopifyCartToAppCart(cart: ShopifyCart): Cart {
  const items: CartItem[] = cart.lines.edges
    .map((edge) => edge.node)
    .filter((line): line is ShopifyCartLineNode => Boolean(line.merchandise))
    .map((line) => {
      const merchandise = line.merchandise!;
      return {
        id: merchandise.id,
        variantId: merchandise.id,
        title: merchandise.product.title,
        variantTitle: merchandise.title,
        handle: merchandise.product.handle,
        price: merchandise.priceV2,
        featuredImage: merchandise.image
          ? { url: merchandise.image.url }
          : undefined,
        quantity: line.quantity,
      };
    });

  const total = items.reduce(
    (sum, item) => sum + parseFloat(item.price.amount) * item.quantity,
    0
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, total, itemCount };
}

export function toCartResponse(cart: ShopifyCart) {
  return {
    cartId: cart.id,
    cart: mapShopifyCartToAppCart(cart),
    checkoutUrl: cart.checkoutUrl,
  };
}
