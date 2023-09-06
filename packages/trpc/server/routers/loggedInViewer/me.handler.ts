import { getOrgFullDomain } from "@calcom/ee/organizations/lib/orgDomains";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type MeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const meHandler = async ({ ctx }: MeOptions) => {
  const crypto = await import("crypto");
  const { user } = ctx;
  // Destructuring here only makes it more illegible
  // pick only the part we want to expose in the API
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
    startTime: user.startTime,
    endTime: user.endTime,
    bufferTime: user.bufferTime,
    locale: user.locale,
    timeFormat: user.timeFormat,
    timeZone: user.timeZone,
    avatar: `${user.organization?.slug ? getOrgFullDomain(user.organization.slug) : WEBAPP_URL}/${
      user.username
    }/avatar.png`,
    createdDate: user.createdDate,
    trialEndsAt: user.trialEndsAt,
    defaultScheduleId: user.defaultScheduleId,
    completedOnboarding: user.completedOnboarding,
    twoFactorEnabled: user.twoFactorEnabled,
    disableImpersonation: user.disableImpersonation,
    identityProvider: user.identityProvider,
    brandColor: user.brandColor,
    darkBrandColor: user.darkBrandColor,
    away: user.away,
    bio: user.bio,
    weekStart: user.weekStart,
    theme: user.theme,
    hideBranding: user.hideBranding,
    metadata: user.metadata,
    defaultBookerLayouts: user.defaultBookerLayouts,
    allowDynamicBooking: user.allowDynamicBooking,
    allowSEOIndexing: user.allowSEOIndexing,
    organizationId: user.organizationId,
    organization: user.organization,
  };
};
