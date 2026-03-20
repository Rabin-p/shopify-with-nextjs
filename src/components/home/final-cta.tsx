import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="container mx-auto px-6 sm:px-10">
      <div className="relative overflow-hidden rounded-[3.5rem] bg-foreground px-8 py-32 text-center text-background shadow-2xl">
        <div className="absolute top-0 right-0 h-full w-1/3 bg-linear-to-l from-white/5 to-transparent skew-x-[-20deg]" />
        <div className="relative z-10 mx-auto max-w-3xl space-y-10">
          <h2 className="text-6xl font-extrabold tracking-tighter sm:text-7xl leading-[0.9]">Ready to <br />transform?</h2>
          <p className="text-xl text-background/70 sm:text-2xl max-w-2xl mx-auto font-medium">
            Join thousands of others building their sanctuary with our curated essentials.
          </p>
          <Button asChild size="lg" variant="secondary" className="h-16 rounded-full px-12 text-xl font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all gap-3">
            <Link href="/products/all" className="flex items-center gap-3">
              Shop the Entire Store <ShoppingBag className="h-6 w-6" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
