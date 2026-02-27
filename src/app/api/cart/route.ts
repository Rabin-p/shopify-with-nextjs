import { NextResponse } from 'next/server';
import { CartItem } from '@/types/cartTypes';
import {
  getAuthenticatedCartContext,
  persistCartReference,
  resolvePreferredCartId,
} from '@/lib/cart/auth';
import { toCartResponse } from '@/lib/cart/mapper';
import { CartLineInput } from '@/lib/cart/types';
import { getOrCreateCustomerCart, isValidVariantId } from '@/lib/cart/service';

type ReplaceCartRequest = {
  items?: CartItem[];
};

function toCartLines(items: CartItem[]): CartLineInput[] {
  return items
    .filter(
      (item) =>
        item &&
        item.quantity > 0 &&
        isValidVariantId(item.variantId || item.id || '')
    )
    .map((item) => ({
      merchandiseId: item.variantId || item.id,
      quantity: item.quantity,
    }));
}

export async function GET() {
  const context = await getAuthenticatedCartContext();
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

export async function PUT(request: Request) {
  const context = await getAuthenticatedCartContext();
  if (!context) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as ReplaceCartRequest;
    const items = Array.isArray(body.items) ? body.items : [];
    const lines = toCartLines(items);

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
