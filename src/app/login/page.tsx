"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";

type LoginResponse = {
  success?: boolean;
  message?: string;
};

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>();

  const onSubmit = async ({ email, password }: LoginFormValues) => {
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as LoginResponse;

      if (!response.ok || !data.success) {
        setError(data.message ?? "Sign in failed.");
        return;
      }

      queryClient.setQueryData(["customer-session"], { authenticated: true });
      await queryClient.invalidateQueries({ queryKey: ["customer-session"] });
      router.push("/account");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Access your account details and order history.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            {...register("email", {
              required: "Email is required.",
            })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="you@example.com"
            autoComplete="email"
          />
          {errors.email ? (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            {...register("password", {
              required: "Password is required.",
            })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="Your password"
            autoComplete="current-password"
          />
          {errors.password ? (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          ) : null}
        </label>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        New customer?{" "}
        <Link className="underline underline-offset-4" href="/register">
          Create an account
        </Link>
      </p>
    </div>
  );
}
