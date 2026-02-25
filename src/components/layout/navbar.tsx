'use client';

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cartStore";

const NAV_LINKS = [
  { href: "/products/all", label: "Shop All" },
  { href: "/products/all?category=living", label: "Living" },
  { href: "/products/all?category=bedroom", label: "Bedroom" },
  { href: "/products/all?category=decor", label: "Decor" },
];

type PredictiveProduct = {
  id: string;
  title: string;
  handle: string;
  priceRange?: {
    minVariantPrice?: {
      amount: string;
      currencyCode: string;
    };
  };
};

type PredictiveSearchResponse = {
  success: boolean;
  products?: PredictiveProduct[];
};

type SessionResponse = {
  authenticated: boolean;
};

function useDebouncedValue(value: string, delay = 250) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
}

function buildSignInUrl() {
  return "/login";
}

async function fetchPredictiveSearch(query: string): Promise<PredictiveProduct[]> {
  const response = await fetch(
    `/api/search/predictive?q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch predictive search results");
  }

  const data = (await response.json()) as PredictiveSearchResponse;
  return Array.isArray(data.products) ? data.products : [];
}

function NavLinks() {
  return (
    <div className="hidden items-center gap-6 lg:flex">
      {NAV_LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function NavbarActions({ signInUrl }: { signInUrl: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { cart, toggleCart } = useCartStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["customer-session"],
    queryFn: async () => {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch session");
      }
      return (await response.json()) as SessionResponse;
    },
    staleTime: 10 * 1000,
  });

  const isAuthenticated = data?.authenticated ?? false;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      queryClient.setQueryData(["customer-session"], { authenticated: false });
      await queryClient.invalidateQueries({ queryKey: ["customer-session"] });
      router.refresh();
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isLoading ? (
        <Button variant="ghost" size="sm" disabled>
          ...
        </Button>
      ) : isAuthenticated ? (
        <>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/account">Account</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Signing out..." : "Log out"}
          </Button>
        </>
      ) : (
        <Button variant="ghost" size="sm" asChild>
          <Link href={signInUrl}>Sign in</Link>
        </Button>
      )}
      <Button size="sm" onClick={toggleCart}>Cart ({cart.itemCount})</Button>
    </div>
  );
}

function PredictiveSearch() {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedQuery = useDebouncedValue(query.trim());
  const hasQuery = debouncedQuery.length >= 2;

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["predictive-search", debouncedQuery],
    queryFn: () => fetchPredictiveSearch(debouncedQuery),
    enabled: hasQuery,
    staleTime: 30 * 1000,
  });
  const resolvedActiveIndex =
    results.length === 0 || activeIndex < 0 || activeIndex >= results.length
      ? (results.length > 0 ? 0 : -1)
      : activeIndex;

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!results.length) return;
    const selected = resolvedActiveIndex >= 0 ? results[resolvedActiveIndex] : results[0];
    if (!selected) return;
    router.push(`/products/${selected.handle}`);
    setIsOpen(false);
    setQuery("");
    setActiveIndex(-1);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const showDropdown = isOpen && hasQuery;

    if (!showDropdown || !results.length) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen && hasQuery;

  return (
    <div ref={searchRef} className="relative mx-3 hidden w-full max-w-sm md:block">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (hasQuery) setIsOpen(true);
            }}
            onKeyDown={handleSearchKeyDown}
            type="search"
            placeholder="Search products..."
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </form>

      {showDropdown ? (
        <div className="absolute left-0 right-0 top-11 z-50 rounded-md border bg-background shadow-lg">
          {isFetching ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
          ) : results.length > 0 ? (
            <ul className="max-h-80 overflow-auto py-1">
              {results.map((product, index) => (
                <li key={product.id}>
                  <Link
                    href={`/products/${product.handle}`}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                      setActiveIndex(-1);
                    }}
                    className={`flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                      resolvedActiveIndex === index ? "bg-accent text-accent-foreground" : ""
                    }`}
                  >
                    <span className="line-clamp-1">{product.title}</span>
                    {product.priceRange?.minVariantPrice ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {product.priceRange.minVariantPrice.currencyCode} {product.priceRange.minVariantPrice.amount}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">No product matches.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function Navbar() {
  const signInUrl = useMemo(() => {
    return buildSignInUrl();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Loom & Lane
        </Link>

        <NavLinks />
        <PredictiveSearch />
        <NavbarActions signInUrl={signInUrl} />
      </nav>
    </header>
  );
}
