import { z } from "zod";

import { AccountRepository } from "@calcom/lib/server/repository/account";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { SecondaryEmailRepository } from "@calcom/lib/server/repository/secondaryEmail";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { teamMetadataSchema, userMetadata } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { getUserAvatarUrl } from "../../getAvatarUrl";

const ZMeOpts = z
  .object({
    includePasswordAdded: z.boolean().optional(),
  })
  .optional();

type TMeOpts = z.infer<typeof ZMeOpts>;

export class ViewerService {
  /**
   * Retrieves the user profile and other related information for the current user.
   * @param userId - The Id of user to retrieve, not necessary if passing sessionUser
   * @param upId - The UpId of the user to retrieve
   * @param sessionUser - If a user session is passed, then it is not fetched again and re used
   */
  static async getMe({
    userId,
    upId,
    opts,
    sessionUser,
  }: {
    userId: number;
    upId: string;
    opts?: TMeOpts;
    sessionUser?: NonNullable<TrpcSessionUser>;
  }) {
    const userFromSession =
      sessionUser ||
      (await UserRepository.getUserFromSessionUpIdAndUserId({
        upId,
        userId,
      }));

    const user = await UserRepository.enrichUserWithTheProfile({
      user: userFromSession,
      upId,
    });

    const allUserEnrichedProfiles = await ProfileRepository.findAllProfilesForUserIncludingMovedUser(user);

    const secondaryEmails = await SecondaryEmailRepository.findAllSecondaryEmailsByUserId(user.id);

    let passwordAdded = false;
    if (user.identityProvider !== IdentityProvider.CAL && opts?.includePasswordAdded) {
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
      const account = await AccountRepository.findUniqueByProviderAndProviderAccountId({
        provider: user.identityProvider.toLocaleLowerCase(),
        providerAccountId: user.identityProviderId,
      });
      identityProviderEmail = account?.providerEmail || "";
    }

    const userMetaData = userMetadata.parse(user.metadata || {});
    const orgMetadata = teamMetadataSchema.parse(user.profile?.organization?.metadata || {});

    const userMetadataPrased = userMetadata.parse(user.metadata);

    const { members = [], ..._organization } = user.profile?.organization || {};
    const isOrgAdmin = members.some((member) => ["OWNER", "ADMIN"].includes(member.role));

    const organization = {
      ..._organization,
      id: user.profile?.organization?.id ?? null,
      isOrgAdmin,
      metadata: orgMetadata,
      requestedSlug: orgMetadata?.requestedSlug ?? null,
    };

    const userWithOrganization = {
      ...user,
      organization,
    };

    // Destructuring here only makes it more illegible
    // pick only the part we want to expose in the API

    const profileData = userWithOrganization.organization?.isPlatform
      ? {
          organizationId: null,
          organization: { id: -1, isPlatform: true, slug: "", isOrgAdmin: false },
          username: user.username ?? null,
          profile: ProfileRepository.buildPersonalProfileFromUser({ user }),
          profiles: [],
        }
      : {
          organizationId: user.profile?.organizationId ?? null,
          organization: userWithOrganization.organization,
          username: user.profile?.username ?? user.username ?? null,
          profile: user.profile ?? null,
          profiles: allUserEnrichedProfiles,
          organizationSettings: user?.profile?.organization?.organizationSettings,
        };

    const isTeamAdminOrOwner =
      (await MembershipRepository.findFirstAdminOrOwnerMembershipByUserId({ userId: user.id })) !== null;

    const crypto = await import("crypto");

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
      emailVerified: user.emailVerified,
      startTime: user.startTime,
      endTime: user.endTime,
      bufferTime: user.bufferTime,
      locale: user.locale ?? "en",
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
      defaultBookerLayouts: userMetaData?.defaultBookerLayouts || null,
      allowDynamicBooking: user.allowDynamicBooking,
      allowSEOIndexing: user.allowSEOIndexing,
      receiveMonthlyDigestEmail: user.receiveMonthlyDigestEmail,
      ...profileData,
      secondaryEmails,
      isPremium: userMetaData?.isPremium,
      ...(passwordAdded ? { passwordAdded } : {}),
      isTeamAdminOrOwner,
    };
  }
}
