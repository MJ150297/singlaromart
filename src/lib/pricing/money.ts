/**
 * Money helpers — the single source of truth for all monetary math in the
 * pricing engine.
 *
 * Rules:
 * - Amounts are rupees with 2 decimal places (paise precision).
 * - This module is the ONLY place that rounds currency values. Every other
 *   module (fetchCart, calculateCart, coupons, credits, delivery fees) must
 *   round through these helpers so the whole system agrees on totals.
 * - `roundMoney` uses round-half-up semantics: 12.345 → 12.35.
 * - All helpers throw `MoneyError` on non-finite or out-of-range input so
 *   pricing bugs surface loudly instead of silently corrupting totals.
 */

const SCALE = 100;
const EPSILON_FIX = Number.EPSILON;

/** Monies at or beyond this magnitude are rejected (upper-bound guard). */
export const MAX_MONEY = 1_000_000_000; // ₹1,000,000,000

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/** Validates that a value is a usable money amount. */
export function assertMoney(value: number, context?: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new MoneyError(
      `Invalid money value ${String(value)}${context ? ` in ${context}` : ""}`
    );
  }
  if (value < -MAX_MONEY || value > MAX_MONEY) {
    throw new MoneyError(
      `Money value out of range ${value}${context ? ` in ${context}` : ""}`
    );
  }
}

/**
 * Rounds a value to 2 decimal places (round-half-up).
 * Normalizes `-0` to `0`.
 */
export function roundMoney(value: number): number {
  assertMoney(value);
  const rounded = Math.round((value + EPSILON_FIX) * SCALE) / SCALE;
  return rounded === 0 ? 0 : rounded;
}

/**
 * Sums money values, rounding once at the end.
 * Guarantees `moneySum([0.1, 0.2]) === 0.3`, avoiding float drift across
 * line-item totals.
 */
export function moneySum(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let acc = 0;
  for (const value of values) {
    assertMoney(value);
    acc += value;
  }
  return roundMoney(acc);
}

/** Multiplies a money amount by a factor (e.g. unit price × quantity). */
export function moneyScale(value: number, factor: number): number {
  assertMoney(value);
  if (typeof factor !== "number" || !Number.isFinite(factor)) {
    throw new MoneyError("moneyScale requires a finite factor");
  }
  return roundMoney(value * factor);
}

/** Clamps a money amount into `[min, max]` after rounding to 2dp. */
export function moneyClamp(value: number, min: number, max: number): number {
  const rounded = roundMoney(value);
  return Math.min(Math.max(rounded, min), max);
}