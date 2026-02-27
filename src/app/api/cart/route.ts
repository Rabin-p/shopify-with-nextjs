import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { shopifyCheckoutFetch } from '@/lib/shopify';
import {
  CUSTOMER_TOKEN_COOKIE,
  getCustomerByAccessToken,
  getStoredCustomerCartId,
  setStoredCustomerCartId,
} from '@/lib/customerAuth';
import { SHOPIFY_CART_COOKIE } from '@/lib/cartSession';
import { Cart, CartItem } from '@/types/cartTypes';

type ShopifyCartLineNode = {
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

type ShopifyCart = {
  id: string;
  checkoutUrl: string;
  lines: {
    edges: Array<{
      node: ShopifyCartLineNode;
    }>;
  };
};

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

type AuthenticatedContext = {
  customerId: string;
  customerAccessToken: string;
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

const isValidVariantId = (id: string) => id.includes('ProductVariant/');
const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function mapShopifyCartToAppCart(cart: ShopifyCart): Cart {
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

function toCartResponse(cart: ShopifyCart) {
  return {
    cartId: cart.id,
    cart: mapShopifyCartToAppCart(cart),
    checkoutUrl: cart.checkoutUrl,
  };
}

async function getCartById(cartId: string) {
  const data = await shopifyCheckoutFetch<CartQueryResponse>({
    query: GET_CART_QUERY,
    variables: { id: cartId },
  });

  return data.cart;
}

async function createCart(params: {
  customerAccessToken: string;
  lines?: Array<{ merchandiseId: string; quantity: number }>;
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

async function bindCartToCustomer(cartId: string, customerAccessToken: string) {
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

async function replaceCartLines(
  cartId: string,
  lines: Array<{ merchandiseId: string; quantity: number }>
) {
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

function setCartCookie(response: NextResponse, cartId: string) {
  response.cookies.set(SHOPIFY_CART_COOKIE, cartId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  });
}

async function getAuthenticatedContext(): Promise<AuthenticatedContext | null> {
  const cookieStore = await cookies();
  const customerAccessToken = cookieStore.get(CUSTOMER_TOKEN_COOKIE)?.value;
  if (!customerAccessToken) return null;

  const customer = await getCustomerByAccessToken(customerAccessToken);
  if (!customer) return null;

  return {
    customerId: customer.id,
    customerAccessToken,
  };
}

async function resolvePreferredCartId(customerId: string) {
  const cookieStore = await cookies();
  const cartIdFromCookie = cookieStore.get(SHOPIFY_CART_COOKIE)?.value;
  const storedCartId = await getStoredCustomerCartId(customerId);
  return cartIdFromCookie || storedCartId || null;
}

async function getOrCreateCustomerCart(params: {
  preferredCartId?: string | null;
  customerAccessToken: string;
  lines?: Array<{ merchandiseId: string; quantity: number }>;
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

async function persistCartReference(
  response: NextResponse,
  params: {
    customerId: string;
    cartId: string;
  }
) {
  setCartCookie(response, params.cartId);
  await setStoredCustomerCartId(params.customerId, params.cartId).catch(
    (error) => {
      console.error('Failed to store customer cart ID:', error);
    }
  );
}

export async function GET() {
  const context = await getAuthenticatedContext();
  if (!context) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const preferredCartId = await resolvePreferredCartId(context.customerId);
    const cart = await getOrCreateCustomerCart({
      preferredCartId,
      customerAccessToken: context.customerAccessToken,
    });

    const response = NextResponse.json({
      authenticated: true,
      ...toCartResponse(cart),
    });
    await persistCartReference(response, {
      customerId: context.customerId,
      cartId: cart.id,
    });
    return response;
  } catch (error) {
    console.error('Failed to load persistent cart:', error);
    return NextResponse.json(
      { authenticated: true, success: false, message: 'Failed to load cart.' },
      { status: 500 }
    );
  }
}

type ReplaceCartRequest = {
  items?: CartItem[];
};

export async function PUT(request: Request) {
  const context = await getAuthenticatedContext();
  if (!context) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as ReplaceCartRequest;
    const rawItems = Array.isArray(body.items) ? body.items : [];

    const normalizedItems = rawItems.filter(
      (item) =>
        item &&
        item.quantity > 0 &&
        isValidVariantId(item.variantId || item.id || '')
    );

    const lines = normalizedItems.map((item) => ({
      merchandiseId: item.variantId || item.id,
      quantity: item.quantity,
    }));

    const preferredCartId = await resolvePreferredCartId(context.customerId);
    const cart = await getOrCreateCustomerCart({
      preferredCartId,
      customerAccessToken: context.customerAccessToken,
      lines,
    });

    const response = NextResponse.json({
      success: true,
      ...toCartResponse(cart),
    });

    await persistCartReference(response, {
      customerId: context.customerId,
      cartId: cart.id,
    });
    return response;
  } catch (error) {
    console.error('Failed to persist cart:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to persist cart.' },
      { status: 500 }
    );
  }
}
