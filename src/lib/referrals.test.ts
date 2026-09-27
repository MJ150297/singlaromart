import { describe, expect, it } from "vitest";
import { createReferralCookieValue, readReferralCookieValue, withReferralParam } from "./referrals";

describe("referral helpers", () => {
  it("encodes and decodes valid referral codes", () => {
    const cookie = createReferralCookieValue("IND123");
    expect(readReferralCookieValue(cookie)).toBe("IND123");
  });

  it("preserves referral params for signup/login redirects", () => {
    expect(withReferralParam("/login", "IND123")).toBe("/login?ref=IND123");
    expect(withReferralParam("/login?callbackUrl=%2Fcheckout", "IND123")).toBe(
      "/login?callbackUrl=%2Fcheckout&ref=IND123",
    );
  });
});
