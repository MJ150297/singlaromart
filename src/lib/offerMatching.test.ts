import { describe, expect, it } from "vitest";
import { matchesOfferTag } from "./offerMatching";

describe("matchesOfferTag", () => {
  it("matches tag values case-insensitively and ignores surrounding whitespace", () => {
    expect(matchesOfferTag("summer", ["Summer", "fresh", "premium"]))
      .toBe(true);
    expect(matchesOfferTag("  summer  ", ["summer", "fresh"]))
      .toBe(true);
  });

  it("does not match partial tag names", () => {
    expect(matchesOfferTag("summer", ["summer-sale", "fresh"]))
      .toBe(false);
    expect(matchesOfferTag("summer", ["summering", "fresh"]))
      .toBe(false);
  });

  it("supports regex special characters in tag names safely", () => {
    expect(matchesOfferTag("promo+sale", ["Promo+Sale", "fresh"]))
      .toBe(true);
  });
});
