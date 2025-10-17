type EventTypeWithBranding = {
  team?: {
    name?: string;
    brandColor?: string | null;
    darkBrandColor?: string | null;
    theme?: string | null;
    parent?: {
      brandColor?: string | null;
      darkBrandColor?: string | null;
      theme?: string | null;
    } | null;
  } | null;
  profile?: {
    organization?: {
      brandColor?: string | null;
      darkBrandColor?: string | null;
      theme?: string | null;
    } | null;
  } | null;
  users: Array<{
    theme?: string | null;
    brandColor?: string | null;
    darkBrandColor?: string | null;
  }>;
};

export function getBrandingForEventType(params: { eventType: EventTypeWithBranding }): {
  theme: string | null;
  brandColor: string | null;
  darkBrandColor: string | null;
} {
  const { eventType } = params;

  if (eventType.team) {
    const branding = eventType.team.parent ?? eventType.team;
    return {
      theme: branding.theme ?? null,
      brandColor: branding.brandColor ?? null,
      darkBrandColor: branding.darkBrandColor ?? null,
    };
  }

  const branding = eventType.profile?.organization ?? eventType.users[0];
  return {
    theme: branding?.theme ?? null,
    brandColor: branding?.brandColor ?? null,
    darkBrandColor: branding?.darkBrandColor ?? null,
  };
}
