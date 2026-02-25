'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { X, Plus, Minus, Trash2, ShoppingBag, Loader2 } from 'lucide-react';
import { useCartStore } from '@/lib/cartStore';

export function CartDrawer() {
  const { cart, removeFromCart, updateQuantity, clearCart, isOpen, closeCart, checkout } = useCartStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const formatPrice = (amount: string, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(parseFloat(amount));
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    const result = await checkout();

    if (result.success && result.checkoutUrl) {
      // Redirect to Shopify checkout
      window.location.href = result.checkoutUrl;
    } else {
      // Show error (you could add a toast notification here)
      console.error('Checkout failed:', result.error);
      alert(result.error || 'Checkout failed. Please try again.');
    }

    setIsCheckingOut(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-background shadow-xl"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b p-6">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Shopping Cart ({cart.itemCount})</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearCart()}
                    className="text-destructive hover:text-destructive"
                  >
                    Clear All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeCart}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              {cart.items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                  <p className="text-center text-muted-foreground">Your cart is empty</p>
                  <Button onClick={closeCart} variant="outline">
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <>
                  {/* Items */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-4">
                      {cart.items.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex gap-4 rounded-lg border p-4"
                        >
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                            {item.featuredImage && (
                              <Image
                                src={item.featuredImage.url}
                                alt={item.title}
                                width={64}
                                height={64}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="truncate text-sm font-medium">{item.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(item.price.amount, item.price.currencyCode)}
                            </p>

                            <div className="mt-2 flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>

                              <span className="w-8 text-center text-sm">{item.quantity}</span>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.id)}
                                className="ml-auto h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span>
                          {cart.items.length > 0
                            ? formatPrice(
                              cart.total.toString(),
                              cart.items[0].price.currencyCode
                            )
                            : '$0.00'
                          }
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          size="lg"
                          onClick={handleCheckout}
                          disabled={isCheckingOut || cart.items.length === 0}
                        >
                          {isCheckingOut ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            'Checkout'
                          )}
                        </Button>
                        <Button variant="outline" size="lg" onClick={closeCart}>
                          Continue Shopping
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
