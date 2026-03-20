import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FeaturedSeries() {
  return (
    <section className="container mx-auto px-6 sm:px-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        <div className="relative aspect-4/5 rounded-[3rem] overflow-hidden shadow-2xl group border border-border/40">
          <Image 
            src="/living_room_category_1774006900753.png"
            alt="Living Room"
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
        <div className="space-y-10">
          <div className="space-y-6">
            <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tighter leading-tight">The Art of <br />Living Room.</h2>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
              Our new Living Room series focuses on textural contrasts—rough-hewn ceramics paired with the softest Belgian linens. Every piece is a conversation between form and comfort.
            </p>
          </div>
          <div className="flex items-center gap-5 py-2">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 w-12 rounded-full border-4 border-background bg-muted overflow-hidden relative shadow-sm">
                  <Image src={`/placeholder.png`} alt="User" fill className="grayscale object-cover" />
                </div>
              ))}
            </div>
            <span className="text-sm font-semibold text-muted-foreground tracking-tight">Joined by 2,400+ satisfied homeowners</span>
          </div>
          <Button asChild variant="ghost" className="h-auto p-0 text-xl font-bold hover:bg-transparent group">
            <Link href="/products/all" className="flex items-center gap-3 underline decoration-primary/30 underline-offset-8 transition-all hover:decoration-primary">
              Discover the series <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
