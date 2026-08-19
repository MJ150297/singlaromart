"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User as UserIcon, Loader2, KeyRound } from "lucide-react";
import { AdminSignupSchema, type AdminSignupForm } from "@/lib/schemas";
import { Button, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input } from "@/components/ui";

interface SetupStatus {
  ownerExists: boolean;
}

export default function AdminSignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [setupToken, setSetupToken] = useState("");

  const form = useForm<AdminSignupForm>({
    resolver: zodResolver(AdminSignupSchema),
  });

  useEffect(() => {
    fetch("/api/auth/setup-status")
      .then((res) => res.json())
      .then((data: { success: boolean; data?: SetupStatus }) => {
        if (data.success) {
          // If owner already exists, redirect to login
          if (data.data?.ownerExists) {
            router.replace("/admin/login");
            return;
          }
        }
      })
      .catch((err) => {
        console.error("Failed to check setup status:", err);
      })
      .finally(() => setCheckingStatus(false));
  }, [router]);

  async function handleSubmit(values: AdminSignupForm) {
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          role: "owner",
          setupToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setIsLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but auto-login failed. Please sign in.");
        setIsLoading(false);
        return;
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Signup error:", err);
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  const { errors } = form.formState;

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-full bg-emerald-600 text-white font-black text-2xl flex items-center justify-center mb-3">
              I
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Create Owner Account
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Initial store owner setup
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          <Form form={form} onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="name">Full Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input id="name" {...field} className="pl-10" placeholder="John Doe" />
                    </div>
                  </FormControl>
                  <FormMessage>{errors.name?.message}</FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="email">Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input id="email" type="email" {...field} className="pl-10" placeholder="you@example.com" />
                    </div>
                  </FormControl>
                  <FormMessage>{errors.email?.message}</FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="password">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input id="password" type="password" {...field} className="pl-10" placeholder="At least 8 characters" />
                    </div>
                  </FormControl>
                  <FormMessage>{errors.password?.message}</FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input id="confirmPassword" type="password" {...field} className="pl-10" placeholder="Re-enter password" />
                    </div>
                  </FormControl>
                  <FormMessage>{errors.confirmPassword?.message}</FormMessage>
                </FormItem>
              )}
            />

            <div>
              <label
                htmlFor="setupToken"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Setup Token
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="setupToken"
                  type="password"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                  required
                  placeholder="Enter your one-time setup token"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                One-time token required to create the initial owner account.
              </p>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Owner Account"
              )}
            </Button>
          </Form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Already have an account? <Link href="/admin/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}