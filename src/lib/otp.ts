import crypto from "crypto";
import { checkRateLimit, getClientIp } from "./rateLimit";

/**
 * OTP helpers for phone-based customer auth.
 * Test mode: OTPs are logged to the console and static code 123456 works
 * when MSG91 credentials are absent or NODE_ENV !== "production".
 * Production: swap the log block with a real MSG91 v5 call (see sendOtp).
 */

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const SEND_MIN_INTERVAL_MS = 60 * 1000; // 1 OTP per 60s per phone
const SEND_PER_PHONE_LIMIT = 5; // 5 sends per hour per phone
const SEND_PER_HOUR_MS = 60 * 60 * 1000;
const SEND_PER_IP_LIMIT = 10; // 10 sends per hour per IP
const VERIFY_ATTEMPT_LIMIT = 5; // 5 verify attempts before lockout

interface OtpRecord {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

// Process-local store. Swap for DB-backed store in multi-instance deploys.
const otpStore = new Map<string, OtpRecord>();

export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return "91" + digits;
  }
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) {
    return "91" + digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    return digits;
  }
  return null;
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function isTestMode(): boolean {
  return Boolean(
    !process.env.MSG91_AUTH_KEY || !process.env.MSG91_OTP_TEMPLATE_ID
  );
}

export async function sendOtp(input: {
  mobile: string;
  req?: Request;
}): Promise<{ ok: true; expiresInMs: number } | { ok: false; message: string }> {
  const { mobile, req } = input;

  if (!/^91[6-9]\d{9}$/.test(mobile)) {
    return { ok: false, message: "Invalid mobile number" };
  }

  const key = "otp:" + mobile;
  const minuteLimited = await checkRateLimit({
    key: "otp-minute",
    identifier: key,
    limit: 1,
    windowMs: SEND_MIN_INTERVAL_MS,
  });
  if (minuteLimited) {
    return { ok: false, message: "Please wait a moment before requesting another OTP" };
  }

  const hourLimited = await checkRateLimit({
    key: "otp-hour",
    identifier: key,
    limit: SEND_PER_PHONE_LIMIT,
    windowMs: SEND_PER_HOUR_MS,
  });
  if (hourLimited) {
    return { ok: false, message: hourLimited };
  }

  if (req) {
    const ip = getClientIp(req);
    const ipLimited = await checkRateLimit({
      key: "otp-ip",
      identifier: "ip:" + ip,
      limit: SEND_PER_IP_LIMIT,
      windowMs: SEND_PER_HOUR_MS,
    });
    if (ipLimited) {
      return { ok: false, message: ipLimited };
    }
  }

  const code = generateOtp();
  otpStore.set(mobile, {
    codeHash: hashOtp(code),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    verified: false,
  });

  if (isTestMode()) {
    console.log("[OTP:TEST] " + mobile + " -> " + code + " (valid " + OTP_TTL_MS / 60000 + " min)");
  } else {
    // TODO: real MSG91 v5 call here:
    // POST https://control.msg91.com/api/v5/otp?template_id=...&mobile=...
    // headers: { authkey: process.env.MSG91_AUTH_KEY }
    console.log("[OTP:MSG91] Would send OTP to " + mobile);
  }

  return { ok: true, expiresInMs: OTP_TTL_MS };
}

export async function verifyOtp(
  mobile: string,
  code: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!/^91[6-9]\d{9}$/.test(mobile)) {
    return { ok: false, message: "Invalid mobile number" };
  }

  const record = otpStore.get(mobile);
  if (!record || record.verified) {
    return { ok: false, message: "OTP expired. Please request a new one." };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(mobile);
    return { ok: false, message: "OTP expired. Please request a new one." };
  }

  if (record.attempts >= VERIFY_ATTEMPT_LIMIT) {
    otpStore.delete(mobile);
    return { ok: false, message: "Too many incorrect attempts. Please request a new OTP." };
  }

  const trimmed = code.trim();
  const isStatic = isTestMode() && trimmed === "123456";
  const isValid = isStatic || hashOtp(trimmed) === record.codeHash;

  if (!isValid) {
    record.attempts += 1;
    return { ok: false, message: "Incorrect OTP" };
  }

  otpStore.delete(mobile);
  return { ok: true };
}