import { shopifyCheckoutFetch } from '@/lib/shopify';
import { CartLineInput, ShopifyCart } from '@/lib/cart/types';

type CartQueryResponse = {
  cart: ShopifyCart | null;
};

type CartCreateResponse = {
  cartCreate: {
    cart: ShopifyCart | null;
    userErrors: Array<{ message: string }>;
  };
};

type CartLinesRemoveResponse = {
  cartLinesRemove: {
    cart: ShopifyCart | null;
    userErrors: Array<{ message: string }>;
  };
};

type CartLinesAddResponse = {
  cartLinesAdd: {
    cart: ShopifyCart | null;
    userErrors: Array<{ message: string }>;
  };
};

type CartBuyerIdentityUpdateResponse = {
  cartBuyerIdentityUpdate: {
    cart: ShopifyCart | null;
    userErrors: Array<{ message: string }>;
  };
};

const CART_FIELDS = `
  id
  checkoutUrl
  lines(first: 250) {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            priceV2 {
              amount
              currencyCode
            }
            image {
              url
            }
            product {
              title
              handle
            }
          }
        }
      }
    }
  }
`;

const GET_CART_QUERY = `
  query getCart($id: ID!) {
    cart(id: $id) {
      ${CART_FIELDS}
    }
  }
`;

const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        ${CART_FIELDS}
      }
      userErrors {
        message
      }
    }
  }
`;

const CART_LINES_REMOVE_MUTATION = `
  mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ${CART_FIELDS}
      }
      userErrors {
        message
      }
    }
  }
`;

const CART_LINES_ADD_MUTATION = `
  mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ${CART_FIELDS}
      }
      userErrors {
        message
      }
    }
  }
`;

const CART_BUYER_IDENTITY_UPDATE_MUTATION = `
  mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        ${CART_FIELDS}
      }
      userErrors {
        message
      }
    }
  }
`;

export const isValidVariantId = (id: string) => id.includes('ProductVariant/');

export async function getCartById(cartId: string) {
  const data = await shopifyCheckoutFetch<CartQueryResponse>({
    query: GET_CART_QUERY,
    variables: { id: cartId },
  });

  return data.cart;
}

export async function createCart(params: {
  customerAccessToken: string;
  lines?: CartLineInput[];
}) {
  const data = await shopifyCheckoutFetch<CartCreateResponse>({
    query: CART_CREATE_MUTATION,
    variables: {
      input: {
        lines: params.lines,
        buyerIdentity: {
          customerAccessToken: params.customerAccessToken,
        },
      },
    },
  });

  if (data.cartCreate.userErrors.length > 0) {
    throw new Error(
      data.cartCreate.userErrors[0]?.message || 'Failed to create cart.'
    );
  }

  if (!data.cartCreate.cart) {
    throw new Error('Cart creation returned no cart.');
  }

  return data.cartCreate.cart;
}

export async function bindCartToCustomer(
  cartId: string,
  customerAccessToken: string
) {
  const data = await shopifyCheckoutFetch<CartBuyerIdentityUpdateResponse>({
    query: CART_BUYER_IDENTITY_UPDATE_MUTATION,
    variables: {
      cartId,
      buyerIdentity: {
        customerAccessToken,
      },
    },
  });

  if (data.cartBuyerIdentityUpdate.userErrors.length > 0) {
    throw new Error(
      data.cartBuyerIdentityUpdate.userErrors[0]?.message ||
        'Failed to update cart buyer identity.'
    );
  }

  if (!data.cartBuyerIdentityUpdate.cart) {
    throw new Error('Cart buyer identity update returned no cart.');
  }

  return data.cartBuyerIdentityUpdate.cart;
}

export async function replaceCartLines(cartId: string, lines: CartLineInput[]) {
  const currentCart = await getCartById(cartId);
  if (!currentCart) {
    throw new Error('Cart no longer exists.');
  }

  const existingLineIds = currentCart.lines.edges.map((edge) => edge.node.id);

  if (existingLineIds.length > 0) {
    const removeData = await shopifyCheckoutFetch<CartLinesRemoveResponse>({
      query: CART_LINES_REMOVE_MUTATION,
      variables: { cartId, lineIds: existingLineIds },
    });

    if (removeData.cartLinesRemove.userErrors.length > 0) {
      throw new Error(
        removeData.cartLinesRemove.userErrors[0]?.message ||
          'Failed to remove existing cart lines.'
      );
    }
  }

  if (lines.length === 0) {
    const emptiedCart = await getCartById(cartId);
    if (!emptiedCart) {
      throw new Error('Cart no longer exists after line removal.');
    }
    return emptiedCart;
  }

  const addData = await shopifyCheckoutFetch<CartLinesAddResponse>({
    query: CART_LINES_ADD_MUTATION,
    variables: {
      cartId,
      lines,
    },
  });

  if (addData.cartLinesAdd.userErrors.length > 0) {
    throw new Error(
      addData.cartLinesAdd.userErrors[0]?.message || 'Failed to add cart lines.'
    );
  }

  if (!addData.cartLinesAdd.cart) {
    throw new Error('Cart lines add returned no cart.');
  }

  return addData.cartLinesAdd.cart;
}

export async function getOrCreateCustomerCart(params: {
  preferredCartId?: string | null;
  customerAccessToken: string;
  lines?: CartLineInput[];
}) {
  const { preferredCartId, customerAccessToken, lines } = params;

  if (!preferredCartId) {
    return createCart({ customerAccessToken, lines });
  }

  const existingCart = await getCartById(preferredCartId);
  if (!existingCart) {
    return createCart({ customerAccessToken, lines });
  }

  await bindCartToCustomer(existingCart.id, customerAccessToken);
  if (!lines) {
    return existingCart;
  }

  return replaceCartLines(existingCart.id, lines);
}
