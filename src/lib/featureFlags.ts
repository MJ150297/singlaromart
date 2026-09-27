export const featureFlags = {
  promotions: true,
  referrals: true,
  storeCredits: true,
  auditEvents: true,
  promotionReports: true,
  shadowPricing: false,
};

export function isFeatureEnabled(flag: keyof typeof featureFlags) {
  return featureFlags[flag];
}
