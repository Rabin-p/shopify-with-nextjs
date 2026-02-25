import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/products/all", label: "Catalog" },
  { href: "#", label: "Shipping" },
  { href: "#", label: "Returns" },
  { href: "#", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2 md:items-end">
        <div className="space-y-2">
          <p className="text-lg font-semibold">Loom & Lane</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Everyday home pieces made with natural textures and clean lines.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 md:justify-end">
          {FOOTER_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
