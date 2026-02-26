import { NextRequest, NextResponse } from 'next/server';
import {
  canUseAdminCustomerTagVerification,
  CUSTOMER_ORIGIN_COOKIE,
  createCustomerAccessToken,
  CUSTOMER_TOKEN_COOKIE,
  getCustomerByAccessToken,
  isSiteCustomer,
} from '@/lib/customerAuth';

type LoginRequest = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequest;
    const email = body.email?.trim() ?? '';
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const { customerAccessToken, customerUserErrors } =
      await createCustomerAccessToken({
        email,
        password,
      });

    if (!customerAccessToken) {
      return NextResponse.json(
        {
          success: false,
          message: customerUserErrors[0]?.message ?? 'Unable to sign in.',
        },
        { status: 401 }
      );
    }

    const customer = await getCustomerByAccessToken(
      customerAccessToken.accessToken
    );
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Unable to load customer profile.' },
        { status: 401 }
      );
    }

    if (canUseAdminCustomerTagVerification()) {
      const verifiedSiteCustomer = await isSiteCustomer(customer.id).catch(
        () => false
      );
      if (!verifiedSiteCustomer) {
        return NextResponse.json(
          {
            success: false,
            message: 'This account is not verified for this storefront.',
          },
          { status: 403 }
        );
      }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(
      CUSTOMER_TOKEN_COOKIE,
      customerAccessToken.accessToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: new Date(customerAccessToken.expiresAt),
      }
    );
    response.cookies.set(CUSTOMER_ORIGIN_COOKIE, customer.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(customerAccessToken.expiresAt),
    });

    return response;
  } catch (error) {
    console.error('Customer login failed:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to sign in.' },
      { status: 500 }
    );
  }
}
