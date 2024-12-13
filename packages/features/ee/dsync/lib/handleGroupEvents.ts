import type { DirectorySyncEvent, Group } from "@boxyhq/saml-jackson";

import { createAProfileForAnExistingUser } from "@calcom/lib/createAProfileForAnExistingUser";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { IdentityProvider, MembershipRole } from "@calcom/prisma/enums";
import {
  getTeamOrThrow,
  sendSignupToOrganizationEmail,
  sendExistingUserTeamInviteEmails,
} from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

import createUsersAndConnectToOrg from "./users/createUsersAndConnectToOrg";

const log = logger.getSubLogger({ prefix: ["dsync/handleGroupEvents"] });

const handleGroupEvents = async (event: DirectorySyncEvent, organizationId: number) => {
  log.debug("called", safeStringify(event));
  // Find the group name associated with the event
  const eventData = event.data as Group;

  // If the group doesn't have any members assigned then return early
  if (!eventData.raw.members.length) {
    return;
  }

  const groupNames = await prisma.dSyncTeamGroupMapping.findMany({
    where: {
      directoryId: event.directory_id,
      groupName: eventData.name,
      organizationId,
    },
    select: {
      teamId: true,
      team: {
        include: {
          parent: {
            include: {
              organizationSettings: true,
            },
          },
          organizationSettings: true,
        },
      },
      groupName: true,
    },
  });

  if (!groupNames.length) {
    return;
  }

  const org = await getTeamOrThrow(organizationId);

  // Check if the group member display property is an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmail = emailRegex.test(eventData.raw.members[0].display);

  let userEmails: string[] = [];

  // TODO: Handle the case where display property is not an email

  if (isEmail) {
    userEmails = eventData.raw.members.map((member: { display: string }) => member.display);
  }

  // Find existing users
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: userEmails,
      },
    },
    select: {
      id: true,
      email: true,
      username: true,
      organizationId: true,
      completedOnboarding: true,
      identityProvider: true,
      profiles: true,
      locale: true,
      teams: true,
      password: {
        select: {
          hash: true,
          userId: true,
        },
      },
    },
  });

  const translation = await getTranslation("en", "common");

  const newUserEmails = userEmails.filter((email) => !users.find((user) => user.email === email));
  // For each team linked to the dsync group name provision members
  for (const group of groupNames) {
    if (newUserEmails.length) {
      const createUsersAndConnectToOrgProps = {
        emailsToCreate: newUserEmails,
        organizationId: org.id,
        identityProvider: IdentityProvider.CAL,
        identityProviderId: null,
      };
      const newUsers = await createUsersAndConnectToOrg(createUsersAndConnectToOrgProps);
      await prisma.membership.createMany({
        data: newUsers.map((user) => ({
          userId: user.id,
          teamId: group.teamId,
          role: MembershipRole.MEMBER,
          accepted: true,
        })),
      });
      await Promise.all(
        newUserEmails.map((email) => {
          return sendSignupToOrganizationEmail({
            usernameOrEmail: email,
            team: group.team,
            translation,
            inviterName: org.name,
            teamId: group.teamId,
            isOrg: false,
          });
        })
      );
    }

    // For existing users create membership for team and org if needed
    await prisma.membership.createMany({
      data: [
        ...users
          .map((user) => {
            return [
              {
                userId: user.id,
                teamId: group.teamId,
                role: MembershipRole.MEMBER,
                accepted: true,
              },
              {
                userId: user.id,
                teamId: organizationId,
                role: MembershipRole.MEMBER,
                accepted: true,
              },
            ];
          })
          .flat(),
      ],
      skipDuplicates: true,
    });

    // Send emails to new members
    const newMembers = users.filter((user) => !user.teams.find((team) => team.id === group.teamId));
    const newOrgMembers = users.filter(
      (user) => !user.profiles.find((profile) => profile.organizationId === organizationId)
    );

    await Promise.all([
      ...newMembers.map(async (user) => {
        const translation = await getTranslation(user.locale || "en", "common");
        return sendExistingUserTeamInviteEmails({
          currentUserTeamName: group.team.name,
          existingUsersWithMemberships: [
            {
              ...user,
              profile: null,
            },
          ],
          language: translation,
          isOrg: false,
          teamId: group.teamId,
          isAutoJoin: true,
          currentUserParentTeamName: org.name,
          orgSlug: null,
        });
      }),
      ...newOrgMembers.map((user) => {
        return createAProfileForAnExistingUser({
          user: {
            id: user.id,
            email: user.email,
            currentUsername: user.username,
          },
          organizationId,
        });
      }),
    ]);
  }
};

export default handleGroupEvents;
