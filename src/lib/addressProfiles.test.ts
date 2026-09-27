import { describe, expect, it } from "vitest";
import { getDefaultAddress, normalizeSavedAddresses } from "./addressProfiles";

describe("addressProfiles", () => {
  it("normalizes and preserves the selected default address", () => {
    const addresses = normalizeSavedAddresses([
      { id: "home", label: "Home", fullAddress: "12, Green Park", isDefault: false },
      { id: "office", label: "Office", fullAddress: "5th Floor, MG Road", isDefault: true },
    ]);

    expect(addresses).toHaveLength(2);
    expect(getDefaultAddress(addresses)).toBe("5th Floor, MG Road");
  });

  it("falls back to the first available saved address", () => {
    const addresses = normalizeSavedAddresses([
      { id: "work", label: "Work", fullAddress: "Block 8, Koramangala" },
    ]);

    expect(getDefaultAddress(addresses)).toBe("Block 8, Koramangala");
  });
});
