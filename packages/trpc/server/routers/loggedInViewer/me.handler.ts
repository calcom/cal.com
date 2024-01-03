import type { Session } from "next-auth";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getOrganizations } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

type MeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
};

export const meHandler = async ({ ctx }: MeOptions) => {
  const crypto = await import("crypto");

  const { user, session } = ctx;
  let profile = null;
  if (session.profileId) {
    profile = await prisma.profile.findUnique({
      where: {
        id: session.profileId,
      },
    });
  }
  const { organizations } = await getOrganizations({ userId: user.id });
  const profiles = await prisma.profile.findMany({
    where: {
      userId: user.id,
    },
  });

  const enrichedProfiles = [
    {
      username: user.username,
      name: "Personal",
      id: null as number | null,
      organization: null as { id: number; name: string } | null,
    },
  ];
  for (const profile of profiles) {
    const organization = await prisma.team.findUnique({
      where: {
        id: profile.organizationId,
      },
    });
    if (!organization) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Organization not found",
      });
    }
    enrichedProfiles.push({
      username: profile.username,
      id: profile.id,
      name: organization.name,
      organization: {
        id: organization.id,
        name: organization.name,
      },
    });
  }
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
    organizationId: organizations[0]?.id ?? null,
    organization: organizations[0] ?? null,
    organizations,
    ...profile,
    profiles: enrichedProfiles,
  };
};
