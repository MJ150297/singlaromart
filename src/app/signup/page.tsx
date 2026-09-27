"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CustomerSignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const refCode = params.get("ref");
    if (refCode) {
      params.set("ref", refCode.trim().toUpperCase());
    }
    if (params.has("callbackUrl")) {
      router.replace(`/login?${params.toString()}`);
    } else if (refCode) {
      router.replace(`/login?ref=${encodeURIComponent(refCode.trim().toUpperCase())}`);
    } else {
      router.replace("/login");
    }
  }, [router, searchParams]);

  return null;
}