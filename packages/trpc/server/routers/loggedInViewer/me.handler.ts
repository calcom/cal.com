import type { Session } from "next-auth";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type MeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
};

export const meHandler = async ({ ctx }: MeOptions) => {
  const crypto = await import("crypto");

  const { user: sessionUser, session } = ctx;

  const allUserEnrichedProfiles = await ProfileRepository.findAllProfilesForUserIncludingMovedUser(
    sessionUser
  );

  const user = await UserRepository.enrichUserWithTheProfile({
    user: sessionUser,
    upId: session.upId,
  });

  const secondaryEmails = await prisma.secondaryEmail.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      email: true,
      emailVerified: true,
    },
  });

  // Destructuring here only makes it more illegible
  // pick only the part we want to expose in the API
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
    emailVerified: user.emailVerified,
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
    appTheme: user.appTheme,
    hideBranding: user.hideBranding,
    metadata: user.metadata,
    defaultBookerLayouts: user.defaultBookerLayouts,
    allowDynamicBooking: user.allowDynamicBooking,
    allowSEOIndexing: user.allowSEOIndexing,
    receiveMonthlyDigestEmail: user.receiveMonthlyDigestEmail,
    organizationId: user.profile?.organizationId ?? null,
    organization: user.organization,
    username: user.profile?.username ?? user.username ?? null,
    profile: user.profile ?? null,
    profiles: allUserEnrichedProfiles,
    secondaryEmails,
  };
};
