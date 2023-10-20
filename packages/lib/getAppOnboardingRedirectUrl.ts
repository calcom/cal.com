export const getAppOnboardingRedirectUrl = (slug: string, teamId?: number) => {
  return `/apps/onboarding/event-types?slug=${slug}${teamId ? `&teamId=${teamId}` : ""}`;
};
