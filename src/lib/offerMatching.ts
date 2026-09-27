export function matchesOfferTag(offerTag: string, productTags: readonly string[] | undefined): boolean {
  const normalizedOfferTag = String(offerTag ?? "").trim().toLowerCase();
  if (!normalizedOfferTag) return false;

  return (productTags ?? []).some((tag) => {
    const normalizedTag = String(tag ?? "").trim().toLowerCase();
    return normalizedTag === normalizedOfferTag;
  });
}
