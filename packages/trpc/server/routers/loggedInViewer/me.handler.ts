import type { Session } from "next-auth";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TMeInputSchema } from "./me.schema";

type MeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
  input: TMeInputSchema;
};

export const meHandler = async ({ ctx, input }: MeOptions) => {
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

  let passwordAdded = false;
  if (user.identityProvider !== IdentityProvider.CAL && input?.includePasswordAdded) {
    const userWithPassword = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        password: true,
      },
    });
    if (userWithPassword?.password?.hash) {
      passwordAdded = true;
    }
  }

  let identityProviderEmail = "";
  if (user.identityProviderId) {
    const account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: user.identityProvider.toLocaleLowerCase(),
          providerAccountId: user.identityProviderId,
        },
      },
      select: { providerEmail: true },
    });
    identityProviderEmail = account?.providerEmail || "";
  }

  const userMetadataPrased = userMetadata.parse(user.metadata);

  // Destructuring here only makes it more illegible
  // pick only the part we want to expose in the API

  const profileData = user.organization?.isPlatform
    ? {
        organizationId: null,
        organization: { id: -1, isPlatform: true, slug: "", isOrgAdmin: false },
        username: user.username ?? null,
        profile: ProfileRepository.buildPersonalProfileFromUser({ user }),
        profiles: [],
      }
    : {
        organizationId: user.profile?.organizationId ?? null,
        organization: user.organization,
        username: user.profile?.username ?? user.username ?? null,
        profile: user.profile ?? null,
        profiles: allUserEnrichedProfiles,
        organizationSettings: user?.profile?.organization?.organizationSettings,
      };

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
    identityProviderEmail,
    brandColor: user.brandColor,
    darkBrandColor: user.darkBrandColor,
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
    ...profileData,
    secondaryEmails,
    isPremium: userMetadataPrased?.isPremium,
    ...(passwordAdded ? { passwordAdded } : {}),
  };
};
