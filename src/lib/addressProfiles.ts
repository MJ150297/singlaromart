export interface SavedAddressItem {
  id: string;
  label: string;
  fullAddress: string;
  isDefault?: boolean;
}

export function normalizeSavedAddresses(value: unknown): SavedAddressItem[] {
  if (!Array.isArray(value)) return [];

  const result: SavedAddressItem[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const id = String(record.id ?? "").trim();
    const label = String(record.label ?? "").trim() || "Address";
    const fullAddress = String(record.fullAddress ?? record.address ?? "").trim();

    if (!id || !fullAddress) continue;

    result.push({
      id,
      label,
      fullAddress,
      isDefault: Boolean(record.isDefault),
    });
  }

  return result;
}

export function getDefaultAddress(addresses: readonly SavedAddressItem[] | undefined): string {
  const list = addresses ?? [];
  const defaultAddress = list.find((item) => item.isDefault)?.fullAddress ?? list[0]?.fullAddress ?? "";
  return defaultAddress.trim();
}
