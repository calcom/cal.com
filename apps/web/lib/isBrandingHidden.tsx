export function isBrandingHidden(hideBrandingSetting: boolean, belongsToActiveTeam: boolean) {
  return belongsToActiveTeam && hideBrandingSetting;
}
