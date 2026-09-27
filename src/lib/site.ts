/**
 * Site / business identity configuration.
 *
 * This is the single source of truth for the visible business name and branding
 * across the storefront, admin area, SEO metadata, PWA manifest, and WhatsApp
 * messages. It is driven entirely by environment variables so the same codebase
 * can be white-labelled for any business — each business is one set of env vars
 * plus a rebuild/deploy (see `.env.local.example`).
 *
 * All defaults below preserve the original "Indiyano" branding, so an install
 * with no branding env vars still renders exactly as before.
 *
 * Only `NEXT_PUBLIC_*` values are safe to import from client components; they
 * are inlined by Next.js at build time.
 */

const name = process.env.NEXT_PUBLIC_BUSINESS_NAME || "Indiyano";
const tagline = process.env.NEXT_PUBLIC_BUSINESS_TAGLINE || "Food & Baverages";

export const site = {
  /** Display name, e.g. "Indiyano". */
  name,
  /** Short tagline shown under the logo, e.g. "Food & Baverages". */
  tagline,
  /** One-line SEO / PWA description. */
  description:
    process.env.NEXT_PUBLIC_BUSINESS_DESCRIPTION ||
    "Fresh groceries and beverages delivered straight to your home.",
  /** Full display name, e.g. "Indiyano Food & Baverages". */
  fullName: `${name} ${tagline}`,
  /** First character of the name, used for the round logo placeholder. */
  logoInitial: [...name.trim()][0]?.toUpperCase() ?? "S",
  /** WhatsApp business number in E.164 without the leading `+`. */
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919876543210",
  /** Support e-mail used as the VAPID subject / general contact fallback. */
  supportEmail: process.env.BUSINESS_SUPPORT_EMAIL || "admin@indiyano.food",
  /**
   * Stable, URL-safe slug that isolates per-business browser storage
   * (redux-persist cart key, push-prompt flag). Businesses deployed on the
   * same origin therefore never share persisted state.
   */
  storageKeyPrefix: (process.env.NEXT_PUBLIC_BUSINESS_KEY || "site")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-"),
};
