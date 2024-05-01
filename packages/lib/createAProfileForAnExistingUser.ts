import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/enums";

import { getOrgUsernameFromEmail } from "../features/auth/signup/utils/getOrgUsernameFromEmail";
import logger from "./logger";
import { safeStringify } from "./safeStringify";

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
  const org = await TeamRepository.findById({ id: organizationId });
  if (!org) {
    throw new Error(`Organization with id ${organizationId} not found`);
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

  await UserRepository.updateWhereId({
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
