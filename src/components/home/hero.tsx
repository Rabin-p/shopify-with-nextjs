import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative h-[85vh] w-full overflow-hidden">
      <Image
        src="/hero_home_interior_1774006855715.png"
        alt="Luxury Minimalist Interior"
        fill
        priority
        className="object-cover transition-transform duration-[3s] hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="container relative mx-auto flex h-full items-center px-6 sm:px-10">
        <div className="max-w-4xl space-y-10 text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">New Collection 2026</span>
          </div>
          <h1 className="text-6xl font-extrabold tracking-tighter sm:text-7xl lg:text-8xl leading-[0.9]">
            Elevate Your <br />
            <span className="text-white underline decoration-primary/40 underline-offset-12">Atmosphere.</span>
          </h1>
          <p className="max-w-xl text-lg text-white/90 sm:text-xl font-medium leading-relaxed">
            Thoughtfully designed essentials for the modern home. 
            Minimalist aesthetics meets unparalleled craftsmanship.
          </p>
          <div className="flex flex-wrap gap-5 pt-4">
            <Button asChild size="lg" className="h-16 rounded-full px-10 text-lg font-bold shadow-2xl transition-transform hover:scale-[1.02]">
              <Link href="/products/all">Explore Collection</Link>
            </Button>
            <Button variant="outline" size="lg" className="h-16 rounded-full border-white/30 bg-white/10 px-10 text-lg font-bold text-white backdrop-blur-md hover:bg-white hover:text-black transition-all">
              <Link href="/products/all" className="flex items-center gap-2">
                Our Story <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
