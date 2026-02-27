"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cartStore";

export function LogoutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { disablePersistentCart } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await fetch("/api/auth/logout", { method: "POST" });
      disablePersistentCart();
      queryClient.setQueryData(["customer-session"], { authenticated: false });
      await queryClient.invalidateQueries({ queryKey: ["customer-session"] });
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleLogout} disabled={isLoading}>
      {isLoading ? "Logging out..." : "Log out"}
    </Button>
  );
}
