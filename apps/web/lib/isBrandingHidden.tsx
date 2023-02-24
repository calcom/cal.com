export function isBrandingHidden(hideBrandingSetting: boolean, hasPaidPlan: boolean) {
  return hasPaidPlan && hideBrandingSetting;
}
