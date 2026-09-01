"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CustomerSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Auto-signup happens on first successful OTP verify at /login.
    // Preserve any query params (e.g. callbackUrl).
    const params = new URLSearchParams(searchParams.toString());
    if (params.has("callbackUrl")) {
      router.replace(`/login?${params.toString()}`);
    } else {
      router.replace("/login");
    }
  }, [router, searchParams]);

  return null;
}