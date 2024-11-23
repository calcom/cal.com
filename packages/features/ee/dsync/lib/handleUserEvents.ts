import type { DirectorySyncEvent, User } from "@boxyhq/saml-jackson";

import removeUserFromOrg from "@calcom/features/ee/dsync/lib/removeUserFromOrg";
import { attribute } from "@calcom/lib/entity/attribute";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { getTeamOrThrow } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
import type { UserWithMembership } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
import { sendExistingUserTeamInviteEmails } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
import { sendSignupToOrganizationEmail } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

import getAttributesFromScimPayload from "./getAttributesFromScimPayload";
import createUsersAndConnectToOrg from "./users/createUsersAndConnectToOrg";
import dSyncUserSelect from "./users/dSyncUserSelect";
import inviteExistingUserToOrg from "./users/inviteExistingUserToOrg";

const log = logger.getSubLogger({ prefix: ["handleUserEvents"] });

const handleUserEvents = async (event: DirectorySyncEvent, organizationId: number) => {
  log.debug("handleUserEvents", safeStringify(event));
  const eventData = event.data as User;
  const userEmail = eventData.email;
  // Check if user exists in DB
  const user = await prisma.user.findFirst({
    where: {
      email: userEmail,
    },
    select: dSyncUserSelect,
  });

  // User is already a part of that org
  if (user && UserRepository.isAMemberOfOrganization({ user, organizationId }) && eventData.active) {
    return;
  }

  const translation = await getTranslation(user?.locale || "en", "common");

  const org = await getTeamOrThrow(organizationId);

  if (!org) {
    throw new Error("Org not found");
  }

  if (user) {
    if (eventData.active) {
      // If data.active is true then provision the user into the org
      const addedUser = await inviteExistingUserToOrg({
        user: user as UserWithMembership,
        org,
        translation,
      });

      await sendExistingUserTeamInviteEmails({
        currentUserName: user.username,
        currentUserTeamName: org.name,
        existingUsersWithMemberships: [
          {
            ...addedUser,
            profile: null,
          },
        ],
        language: translation,
        isOrg: true,
        teamId: org.id,
        isAutoJoin: true,
        currentUserParentTeamName: org?.parent?.name,
        orgSlug: org.slug,
      });
    } else {
      // If data.active is false then remove the user from the org
      await removeUserFromOrg({
        userId: user.id,
        orgId: organizationId,
      });
    }
    // If user is not in DB, create user and add to the org
  } else {
    const createUsersAndConnectToOrgProps = {
      emailsToCreate: [userEmail],
      organizationId: org.id,
      identityProvider: IdentityProvider.CAL,
      identityProviderId: null,
    };
    await createUsersAndConnectToOrg(createUsersAndConnectToOrgProps);

    await sendSignupToOrganizationEmail({
      usernameOrEmail: userEmail,
      team: org,
      translation,
      inviterName: org.name,
      teamId: organizationId,
      isOrg: true,
    });
  }

  const updatedUser = await prisma.user.findFirst({
    where: {
      email: userEmail,
    },
    select: dSyncUserSelect,
  });

  if (!updatedUser) {
    log.error("handleUserEvents", `User still not created in DB ${userEmail}`);
    return;
  }

  const customAttributes = getAttributesFromScimPayload(event);
  const { numOfAttributeOptionsSet } = await attribute.setValueForUser({
    orgId: org.id,
    userId: updatedUser.id,
    attributeLabelToValueMap: customAttributes,
  });

  log.debug("handleUserEvents", `Number of attribute options set: ${numOfAttributeOptionsSet}`);
};

export default handleUserEvents;
