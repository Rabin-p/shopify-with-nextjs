import { Truck, ShieldCheck, Zap } from "lucide-react";

const VALUE_PROPS = [
  {
    icon: Truck,
    title: "Global Shipping",
    description: "Complimentary delivery on all orders over $200."
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    description: "100% encrypted and protected checkout experience."
  },
  {
    icon: Zap,
    title: "Next-Day Dispatch",
    description: "Quick turnaround to get your items home faster."
  }
];

export function ValueProps() {
  return (
    <section className="container mx-auto px-6 sm:px-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16 py-24 border-y border-border/60">
        {VALUE_PROPS.map((prop) => (
          <div key={prop.title} className="flex flex-col items-center text-center space-y-6 group">
            <div className="h-20 w-20 rounded-[2rem] bg-primary/5 flex items-center justify-center text-primary transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 shadow-sm border border-primary/10">
              <prop.icon className="h-10 w-10" />
            </div>
            <div className="space-y-3">
              <h4 className="text-2xl font-bold tracking-tight">{prop.title}</h4>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-[300px]">{prop.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
