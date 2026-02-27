import { NextResponse } from 'next/server';
import {
  CUSTOMER_ORIGIN_COOKIE,
  CUSTOMER_TOKEN_COOKIE,
} from '@/lib/customerAuth';
import { SHOPIFY_CART_COOKIE } from '@/lib/constants/cookies';

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(CUSTOMER_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(CUSTOMER_ORIGIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(SHOPIFY_CART_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
