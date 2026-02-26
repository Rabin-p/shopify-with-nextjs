import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CATEGORIES = [
  {
    name: "Living Room",
    description: "Soft textures and modern essentials for relaxed spaces.",
  },
  {
    name: "Bedroom",
    description: "Comfort-first pieces designed for better mornings.",
  },
  {
    name: "Decor",
    description: "Small details that add warmth and personality.",
  },
];

const HIGHLIGHTS = [
  { title: "Woven Throw", price: "$64" },
  { title: "Essentials Pillows", price: "$48" },
  { title: "Oak Side Lamp", price: "$89" },
];

export default function Home() {
  return (
    <div className="container mx-auto flex w-full flex-col gap-16 px-4 py-10 sm:px-6">
      <section className="overflow-hidden rounded-3xl border bg-linear-to-br from-secondary to-background p-8 sm:p-12">
        <div className="max-w-2xl space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            New Collection
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Build your calm corner at home.
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Thoughtful pieces for everyday living, shipped fast and curated
            for comfort.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/products/all">Shop all products</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            Shop by Category
          </h2>
          <Link
            href="/products/all"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {CATEGORIES.map((category) => (
            <Card key={category.name} className="gap-3">
              <CardHeader>
                <CardTitle>{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          Trending This Week
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((product) => (
            <Card key={product.title} className="gap-4">
              <div className="h-44 rounded-lg bg-muted" />
              <CardContent className="space-y-2">
                <p className="font-medium">{product.title}</p>
                <p className="text-sm text-muted-foreground">
                  Starting at {product.price}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
