import { Hero } from "@/components/home/hero";
import { FeaturedSeries } from "@/components/home/featured-series";
import { CategoryGrid } from "@/components/home/category-grid";
import { ValueProps } from "@/components/home/value-props";
import { FinalCTA } from "@/components/home/final-cta";

export default function Home() {
  return (
    <div className="flex flex-col gap-24 pb-20">
      <Hero />
      <FeaturedSeries />
      <CategoryGrid />
      <ValueProps />
      <FinalCTA />
    </div>
  );
}
