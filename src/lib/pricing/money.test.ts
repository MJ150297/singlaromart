import { describe, expect, it } from "vitest";
import {
  MAX_MONEY,
  MoneyError,
  assertMoney,
  moneyClamp,
  moneyScale,
  moneySum,
  roundMoney,
} from "./money";

describe("roundMoney", () => {
  it("rounds to 2 decimal places (half-up)", () => {
    expect(roundMoney(12.345)).toBe(12.35);
    expect(roundMoney(12.344)).toBe(12.34);
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(0.004)).toBe(0);
    expect(roundMoney(19.99)).toBe(19.99);
  });

  it("preserves negative amounts", () => {
    expect(roundMoney(-1.25)).toBe(-1.25);
    expect(roundMoney(-0.01)).toBe(-0.01);
  });

  it("normalizes -0 to 0", () => {
    expect(Object.is(roundMoney(-0.001), 0)).toBe(true);
  });

  it("throws on non-finite input", () => {
    expect(() => roundMoney(NaN)).toThrow(MoneyError);
    expect(() => roundMoney(Infinity)).toThrow(MoneyError);
    expect(() => roundMoney(-Infinity)).toThrow(MoneyError);
  });

  it("throws on out-of-range input", () => {
    expect(() => roundMoney(MAX_MONEY + 1)).toThrow(MoneyError);
    expect(() => roundMoney(-MAX_MONEY - 1)).toThrow(MoneyError);
  });
});

describe("assertMoney", () => {
  it("accepts finite values", () => {
    expect(() => assertMoney(0)).not.toThrow();
    expect(() => assertMoney(-250.75)).not.toThrow();
  });

  it("rejects NaN/Infinity", () => {
    expect(() => assertMoney(Number.NaN, "coupon")).toThrow(MoneyError);
    expect(() => assertMoney(Number.POSITIVE_INFINITY)).toThrow(MoneyError);
  });
});

describe("moneySum", () => {
  it("adds without float drift", () => {
    expect(moneySum([0.1, 0.2])).toBe(0.3);
    expect(moneySum([10.1, 20.2])).toBe(30.3);
  });

  it("rounds the accumulated total once", () => {
    expect(moneySum([12.344, 1])).toBe(13.34);
  });

  it("handles a single value and empty input", () => {
    expect(moneySum([5.555])).toBe(5.56);
    expect(moneySum([])).toBe(0);
  });

  it("supports negative values (refunds/restores)", () => {
    expect(moneySum([100, -25.25])).toBe(74.75);
  });

  it("rejects non-finite members", () => {
    expect(() => moneySum([1, NaN])).toThrow(MoneyError);
  });
});

describe("moneyScale", () => {
  it("computes line totals with rounding", () => {
    expect(moneyScale(12.5, 3)).toBe(37.5);
    expect(moneyScale(99.99, 2)).toBe(199.98);
    expect(moneyScale(12.345, 1)).toBe(12.35);
  });

  it("rejects non-finite factors", () => {
    expect(() => moneyScale(10, NaN)).toThrow(MoneyError);
  });
});

describe("moneyClamp", () => {
  it("clamps above max and below min", () => {
    expect(moneyClamp(150, 0, 100)).toBe(100);
    expect(moneyClamp(-1, 0, 100)).toBe(0);
  });

  it("rounds then clamps", () => {
    expect(moneyClamp(5.126, 0, 10)).toBe(5.13);
    expect(moneyClamp(5.126, 0, 5)).toBe(5);
  });
});