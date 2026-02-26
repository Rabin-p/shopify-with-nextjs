import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  canUseAdminCustomerTagVerification,
  CUSTOMER_ORIGIN_COOKIE,
  CUSTOMER_TOKEN_COOKIE,
  getCustomerByAccessToken,
  isSiteCustomer,
} from '@/lib/customerAuth';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const customer = await getCustomerByAccessToken(token);
    if (!customer) {
      return NextResponse.json({ authenticated: false });
    }

    if (canUseAdminCustomerTagVerification()) {
      const originCustomerId = cookieStore.get(CUSTOMER_ORIGIN_COOKIE)?.value;
      if (!originCustomerId || originCustomerId !== customer.id) {
        return NextResponse.json({ authenticated: false });
      }

      const verifiedSiteCustomer = await isSiteCustomer(customer.id);
      if (!verifiedSiteCustomer) {
        return NextResponse.json({ authenticated: false });
      }
    }

    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
