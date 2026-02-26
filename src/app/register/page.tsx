"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";

type RegisterResponse = {
  success?: boolean;
  message?: string;
};

type RegisterFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>();

  const onSubmit = async ({
    firstName,
    lastName,
    email,
    password,
  }: RegisterFormValues) => {
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      const data = (await response.json()) as RegisterResponse;
      if (!response.ok || !data.success) {
        setError(data.message ?? "Registration failed.");
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
      <h1 className="text-3xl font-semibold tracking-tight">Create account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Register from this storefront to sign in and view your account.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium">First name</span>
            <input
              type="text"
              {...register("firstName")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              autoComplete="given-name"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Last name</span>
            <input
              type="text"
              {...register("lastName")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              autoComplete="family-name"
            />
          </label>
        </div>

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
              minLength: {
                value: 8,
                message: "Password must be at least 8 characters.",
              },
            })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            placeholder="At least 8 characters"
            autoComplete="new-password"
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
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="underline underline-offset-4" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
