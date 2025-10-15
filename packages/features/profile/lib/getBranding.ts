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

/**
 * Returns branding properties (theme, brandColor, darkBrandColor) for an event type.
 *
 * Applies organization-level brand overrides when available:
 * - For team events: organization branding → team branding → null
 * - For personal events: organization branding → user branding → null
 *
 * This ensures that organization-wide brand consistency can be enforced across
 * all event types (both team and personal) within the organization.
 */
export function getBrandingForEventType(params: { eventType: EventTypeWithBranding }): {
  theme: string | null;
  brandColor: string | null;
  darkBrandColor: string | null;
} {
  const { eventType } = params;

  if (eventType.team) {
    return {
      theme: eventType.team.parent?.theme ?? eventType.team.theme ?? null,
      brandColor: eventType.team.parent?.brandColor ?? eventType.team.brandColor ?? null,
      darkBrandColor: eventType.team.parent?.darkBrandColor ?? eventType.team.darkBrandColor ?? null,
    };
  }

  const user = eventType.users[0];
  return {
    theme: eventType.profile?.organization?.theme ?? user?.theme ?? null,
    brandColor: eventType.profile?.organization?.brandColor ?? user?.brandColor ?? null,
    darkBrandColor: eventType.profile?.organization?.darkBrandColor ?? user?.darkBrandColor ?? null,
  };
}
