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

type UserWithBranding = {
  theme?: string | null;
  brandColor?: string | null;
  darkBrandColor?: string | null;
  profile: {
    organization?: {
      brandColor?: string | null;
      darkBrandColor?: string | null;
      theme?: string | null;
    } | null;
  };
};

type TeamWithBranding = {
  brandColor?: string | null;
  darkBrandColor?: string | null;
  theme?: string | null;
  parent?: {
    brandColor?: string | null;
    darkBrandColor?: string | null;
    theme?: string | null;
  } | null;
};

type BrandingResult = {
  theme: string | null;
  brandColor: string | null;
  darkBrandColor: string | null;
};

export function getBrandingForEventType(params: { eventType: EventTypeWithBranding }): BrandingResult {
  const { eventType } = params;

  if (eventType.team) {
    const brandColorData =
      eventType.team.parent?.brandColor || eventType.team.parent?.darkBrandColor
        ? eventType.team.parent
        : eventType.team;
    return {
      theme: eventType.team.parent?.theme ?? eventType.team.theme ?? null,
      brandColor: brandColorData.brandColor ?? null,
      darkBrandColor: brandColorData.darkBrandColor ?? null,
    };
  }

  const branding = eventType.profile?.organization ?? eventType.users[0];
  return {
    theme: branding?.theme ?? null,
    brandColor: branding?.brandColor ?? null,
    darkBrandColor: branding?.darkBrandColor ?? null,
  };
}

export function getBrandingForUser(params: { user: UserWithBranding }): BrandingResult {
  const { user } = params;
  const branding = user.profile.organization ?? user;
  return {
    theme: branding.theme ?? null,
    brandColor: branding.brandColor ?? null,
    darkBrandColor: branding.darkBrandColor ?? null,
  };
}

export function getBrandingForTeam(params: { team: TeamWithBranding }): BrandingResult {
  const { team } = params;
  const brandColorData = team.parent?.brandColor || team.parent?.darkBrandColor ? team.parent : team;
  return {
    theme: team.parent?.theme ?? team.theme ?? null,
    brandColor: brandColorData.brandColor ?? null,
    darkBrandColor: brandColorData.darkBrandColor ?? null,
  };
}
