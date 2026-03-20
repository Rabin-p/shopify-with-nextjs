import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CATEGORIES = [
  {
    name: "Living Room",
    description: "Serene spaces for everyday life.",
    image: "living_room_category_1774006900753.png",
  },
  {
    name: "Bedroom",
    description: "Linen essentials for better rest.",
    image: "bedroom_category_1774006963457.png",
  },
  {
    name: "Decor",
    description: "Vases, candles & minimal details.",
    image: "decor_category_1774007013209.png",
  },
];

export function CategoryGrid() {
  return (
    <section className="bg-secondary/20">
      <div className="container mx-auto px-6 sm:px-10">
        <div className="mb-20 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-4">
            <h2 className="text-5xl font-extrabold tracking-tighter">Shop by Scene.</h2>
            <p className="text-xl text-muted-foreground max-w-lg">Curated environments for every rhythm of your day.</p>
          </div>
          <Button asChild variant="link" className="h-auto p-0 text-xl font-bold group">
            <Link href="/products/all" className="flex items-center">View all scenes <ArrowRight className="ml-3 h-6 w-6 transition-transform group-hover:translate-x-2" /></Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {CATEGORIES.map((category) => (
            <Link 
              key={category.name} 
              href="/products/all" 
              className="group relative h-[600px] overflow-hidden rounded-[2.5rem] bg-muted border border-border/40 transition-all duration-500 hover:shadow-2xl"
            >
              <Image 
                src={`/${category.image}`} 
                alt={category.name} 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1" 
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
              <div className="absolute bottom-10 left-10 space-y-2 text-white">
                <h3 className="text-3xl font-bold tracking-tight">{category.name}</h3>
                <p className="text-white/60 font-medium">{category.description}</p>
                <div className="pt-4 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-[-10px]">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-bold uppercase backdrop-blur-md">
                    Shop Scene
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
