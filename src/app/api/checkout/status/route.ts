import { NextResponse } from 'next/server';
import { getCartById } from '@/lib/cart/service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cartId = searchParams.get('cartId');

  if (!cartId) {
    return NextResponse.json({ success: false, message: 'Missing cartId' }, { status: 400 });
  }

  try {
    const cart = await getCartById(cartId);
    
    if (!cart) {
      return NextResponse.json({ success: true, status: 'completed' });
    }

    return NextResponse.json({ success: true, status: 'active' });
  } catch (error) {
    console.error('Failed to fetch cart status:', error);
    return NextResponse.json({ success: true, status: 'completed' });
  }
}
