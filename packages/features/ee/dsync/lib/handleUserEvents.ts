import type { DirectorySyncEvent, User } from "@boxyhq/saml-jackson";

import removeUserFromOrg from "@calcom/features/ee/dsync/lib/removeUserFromOrg";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";
import { getTeamOrThrow } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
import type { UserWithMembership } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
import { sendExistingUserTeamInviteEmails } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
import { sendSignupToOrganizationEmail } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

import createUsersAndConnectToOrg from "./users/createUsersAndConnectToOrg";
import dSyncUserSelect from "./users/dSyncUserSelect";
import inviteExistingUserToOrg from "./users/inviteExistingUserToOrg";

const handleUserEvents = async (event: DirectorySyncEvent, organizationId: number) => {
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
  if (user?.organizationId && eventData.active) {
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
};

export default handleUserEvents;
