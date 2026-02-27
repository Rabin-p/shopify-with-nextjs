import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { shopifyCheckoutFetch } from '@/lib/shopify';
import { CUSTOMER_TOKEN_COOKIE } from '@/lib/customerAuth';
import { SHOPIFY_CART_COOKIE } from '@/lib/cartSession';
import { CartItem } from '@/types/cartTypes';

interface CartCreateResponse {
  cartCreate: {
    cart: {
      id: string;
      checkoutUrl: string;
      estimatedCost: {
        subtotalAmount: {
          amount: string;
          currencyCode: string;
        };
        totalAmount: {
          amount: string;
          currencyCode: string;
        };
        totalTaxAmount: {
          amount: string;
          currencyCode: string;
        } | null;
      };
      lines: {
        edges: Array<{
          node: {
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
                id: string;
                title: string;
                handle: string;
              };
            };
          };
        }>;
      };
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: Array<string | number>;
    extensions?: Record<string, unknown>;
  }>;
}

const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        estimatedCost {
          subtotalAmount {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
          }
          totalTaxAmount {
            amount
            currencyCode
          }
        }
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
                  product {
                    id
                    title
                    handle
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const customerAccessToken = cookieStore.get(CUSTOMER_TOKEN_COOKIE)?.value;
    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Cart is empty' },
        { status: 400 }
      );
    }

    const normalizedItems = items as CartItem[];
    const invalidItem = normalizedItems.find(
      (item) =>
        !item ||
        !item.quantity ||
        item.quantity < 1 ||
        (!item.variantId && !item.id?.includes('ProductVariant/'))
    );

    if (invalidItem) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Cart contains an invalid item. Please remove it and add the product again.',
        },
        { status: 400 }
      );
    }

    // Shopify cart lines require a ProductVariant GID as the merchandiseId.
    const lines = normalizedItems.map((item) => ({
      merchandiseId: item.variantId || item.id,
      quantity: item.quantity,
    }));

    const data = await shopifyCheckoutFetch<CartCreateResponse>({
      query: CART_CREATE_MUTATION,
      variables: {
        input: {
          lines,
          ...(customerAccessToken
            ? {
                buyerIdentity: {
                  customerAccessToken,
                },
              }
            : {}),
        },
      },
    });

    // Check for GraphQL errors in the response
    if (data.errors && data.errors.length > 0) {
      console.error('GraphQL errors:', data.errors);
      return NextResponse.json(
        {
          success: false,
          message: `GraphQL Error: ${data.errors[0].message}`,
        },
        { status: 400 }
      );
    }

    const { cart, userErrors } = data.cartCreate;

    if (userErrors && userErrors.length > 0) {
      console.error('Cart errors:', userErrors);
      return NextResponse.json(
        {
          success: false,
          message: userErrors[0].message,
        },
        { status: 400 }
      );
    }

    if (!cart) {
      console.error('Cart is null - cartCreate response:', data.cartCreate);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to create cart - no cart returned from Shopify',
        },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      checkoutUrl: cart.checkoutUrl,
      checkout: {
        id: cart.id,
        subtotalPrice: cart.estimatedCost.subtotalAmount,
        totalTax: cart.estimatedCost.totalTaxAmount,
        totalPrice: cart.estimatedCost.totalAmount,
        lineItems: cart.lines.edges.map((edge) => edge.node),
      },
    });
    response.cookies.set(SHOPIFY_CART_COOKIE, cart.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    console.error('Checkout API Error:', error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to process checkout';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
