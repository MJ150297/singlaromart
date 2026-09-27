/** Normalize comma-separated catalog labels into stable, duplicate-free values. */
export function normalizeCatalogLabels(values: readonly unknown[] | undefined): string[] {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => String(value ?? "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export function normalizeCatalogTag(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}
