import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  CUSTOMER_TOKEN_COOKIE,
  getCustomerByAccessToken,
  getStoredCustomerCartId,
  setStoredCustomerCartId,
} from '@/lib/customerAuth';
import { SHOPIFY_CART_COOKIE } from '@/lib/constants/cookies';

const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AuthenticatedCartContext = {
  customerId: string;
  customerAccessToken: string;
};

export async function getAuthenticatedCartContext(): Promise<AuthenticatedCartContext | null> {
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

export async function resolvePreferredCartId(customerId: string) {
  const cookieStore = await cookies();
  const cartIdFromCookie = cookieStore.get(SHOPIFY_CART_COOKIE)?.value;
  const storedCartId = await getStoredCustomerCartId(customerId);
  return cartIdFromCookie || storedCartId || null;
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

export async function persistCartReference(
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
