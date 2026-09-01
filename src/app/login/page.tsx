"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Smartphone, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function validMobile(raw: string) {
    const d = raw.replace(/\D/g, "");
    return d.length === 10 && /^[6-9]/.test(d);
  }

  async function sendOtp() {
    setError("");
    if (!validMobile(mobile)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to send OTP");
        return;
      }
      setStep("otp");
      setOtp("");
      setCooldown(60);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function resendOtp() {
    setResendLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to resend OTP");
      } else {
        setCooldown(60);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  async function verifyOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (otp.trim().length < 4) {
      setError("Please enter the OTP");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        mobile,
        otp,
        redirect: false,
      });
      if (result?.error) {
        const messages: Record<string, string> = {
          InvalidMobile: "Invalid mobile number",
          InvalidOtp: "Incorrect OTP",
          TooManyOtpAttempts: "Too many incorrect attempts. Please request a new OTP.",
          RateLimited: "Too many login attempts. Please wait a few minutes.",
          ServerError: "Something went wrong. Please try again.",
        };
        setError(messages[result.error] || "Login failed. Please try again.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (step === "otp" && otp.trim().length >= 4 && !isLoading) {
      // OTP auto-submit intentionally updates login state after the input settles.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      verifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  function back() {
    setStep("phone");
    setError("");
    setOtp("");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-full bg-emerald-600 text-white font-black text-2xl flex items-center justify-center mb-3">
              I
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {step === "phone" ? "Sign in with OTP" : "Verify OTP"}
            </h1>
            <p className="text-sm text-slate-500 mt-1 text-center">
              {step === "phone"
                ? "Enter your mobile number to continue"
                : "We sent a 6-digit code to " + mobile}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {step === "phone" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendOtp();
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">+91</span>
                  <input
                    id="mobile"
                    type="tel"
                    inputMode="numeric"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                    required
                    placeholder="9876543210"
                    className="w-full pl-12 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    Send OTP
                  </>
                )}
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyOtp();
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Enter OTP
                </label>
                <input
                  ref={otpRef}
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                  required
                  placeholder="••••••"
                  className="w-full px-3 py-3 text-center text-xl tracking-[0.5em] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !otp}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Verify & Continue
                  </>
                )}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={back} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change number
                </button>
                {cooldown > 0 ? (
                  <span className="text-slate-400">Resend in {cooldown}s</span>
                ) : (
                  <button type="button" onClick={resendOtp} disabled={resendLoading} className="text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50">
                    {resendLoading ? "Sending..." : "Resend OTP"}
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-slate-500">
            Don&#39;t have an account?{" "}
            <Link href="/signup" className="text-emerald-600 hover:text-emerald-700 font-semibold">
              Create one
            </Link>
            <span className="text-slate-400"> — it&#39;s free and your first OTP login</span>
          </div>
        </div>
      </div>
    </div>
  );
}
