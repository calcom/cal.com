import type { Session } from "next-auth";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getAllProfiles } from "@calcom/lib/server/repository/profile";
import { getOrganizationForUser, getOrganizationProfile } from "@calcom/lib/server/repository/user";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type MeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
};

export const meHandler = async ({ ctx }: MeOptions) => {
  const crypto = await import("crypto");

  const { user, session } = ctx;

  const allUserEnrichedProfiles = await getAllProfiles(user);

  const organizationProfile = await getOrganizationProfile({
    profileId: session.profileId ?? null,
    userId: user.id,
  });

  let chosenOrganization;

  if (organizationProfile) {
    chosenOrganization = await getOrganizationForUser({
      userId: user.id,
      organizationId: organizationProfile.organizationId,
    });
  }

  // Destructuring here only makes it more illegible
  // pick only the part we want to expose in the API
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
    startTime: user.startTime,
    endTime: user.endTime,
    bufferTime: user.bufferTime,
    locale: user.locale,
    timeFormat: user.timeFormat,
    timeZone: user.timeZone,
    avatar: getUserAvatarUrl(user),
    avatarUrl: user.avatarUrl,
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
    receiveMonthlyDigestEmail: user.receiveMonthlyDigestEmail,
    organizationId: chosenOrganization?.id ?? null,
    organization: chosenOrganization ?? null,
    username: organizationProfile?.username ?? user.username ?? null,
    profiles: allUserEnrichedProfiles,
  };
};
