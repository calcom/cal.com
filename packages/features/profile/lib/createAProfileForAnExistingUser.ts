import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["lib", "createAProfileForAnExistingUser"] });
export const createAProfileForAnExistingUser = async ({
  user,
  organizationId,
}: {
  user: {
    email: string;
    id: number;
    currentUsername: string | null;
  };
  organizationId: number;
}) => {
  const teamRepo = new TeamRepository(prisma);
  const org = await teamRepo.findById({ id: organizationId });
  if (!org) {
    throw new Error(`Organization with id ${organizationId} not found`);
  }

  const existingProfile = await ProfileRepository.findByUserIdAndOrgId({
    userId: user.id,
    organizationId,
  });

  if (existingProfile) {
    return existingProfile;
  }

  const usernameInOrg = getOrgUsernameFromEmail(
    user.email,
    org.organizationSettings?.orgAutoAcceptEmail ?? null
  );
  const profile = await ProfileRepository.createForExistingUser({
    userId: user.id,
    organizationId,
    username: usernameInOrg,
    email: user.email,
    movedFromUserId: user.id,
  });

  const userRepo = new UserRepository(prisma);
  await userRepo.updateWhereId({
    whereId: user.id,
    data: {
      movedToProfileId: profile.id,
    },
  });

  log.debug(
    "Created profile for user",
    safeStringify({ userId: user.id, profileId: profile.id, usernameInOrg, username: user.currentUsername })
  );

  const orgSlug = org.slug || org.requestedSlug;

  if (!orgSlug) {
    throw new Error(`Organization with id ${organizationId} doesn't have a slug`);
  }

  const orgUrl = getOrgFullOrigin(orgSlug);

  if (org.isPlatform) {
    // We don't want redirects for Platform Organizations
    return profile;
  }

  if (user.currentUsername) {
    log.debug(`Creating redirect for user ${user.currentUsername} to ${orgUrl}/${usernameInOrg}`);
    await prisma.tempOrgRedirect.upsert({
      where: {
        from_type_fromOrgId: {
          from: user.currentUsername,
          type: RedirectType.User,
          fromOrgId: 0,
        },
      },
      update: {
        type: RedirectType.User,
        from: user.currentUsername,
        fromOrgId: 0,
        toUrl: `${orgUrl}/${usernameInOrg}`,
      },
      create: {
        type: RedirectType.User,
        from: user.currentUsername,
        fromOrgId: 0,
        toUrl: `${orgUrl}/${usernameInOrg}`,
      },
    });
  } else {
    log.debug(`Skipping redirect setup as ${user.id} doesn't have a username`);
  }
  return profile;
};
