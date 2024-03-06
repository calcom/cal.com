import type { DirectorySyncEvent, Group } from "@boxyhq/saml-jackson";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import {
  getTeamOrThrow,
  sendSignupToOrganizationEmail,
  createAProfileForAnExistingUser,
} from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

import createUsersAndConnectToOrg from "./users/createUsersAndConnectToOrg";

const handleGroupEvents = async (event: DirectorySyncEvent, orgId: number) => {
  const { dsyncController } = await jackson();
  // Find the group name associated with the event
  const eventData = event.data as Group;

  const groupNames = await prisma.dSyncTeamGroupMapping.findMany({
    where: {
      directoryId: event.directory_id,
      groupName: eventData.name,
      orgId,
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

  const org = await getTeamOrThrow(orgId);

  // Check if the group member display property is an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmail = emailRegex.test(eventData.raw.members[0].display);

  let userEmails: string[] = [];

  // TODO: Handle the case where display property is not an email

  if (isEmail) {
    userEmails = eventData.raw.members.map((member) => member.display);
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
      teams: {
        select: {
          id: true,
        },
      },
      password: {
        select: {
          hash: true,
        },
      },
    },
  });

  const translation = await getTranslation("en", "common");

  const newUserEmails = userEmails.filter((email) => !users.find((user) => user.email === email));
  // For each team linked to the dsync group name provision members
  for (const group of groupNames) {
    if (newUserEmails.length) {
      await createUsersAndConnectToOrg({
        emailsToCreate: newUserEmails,
        org,
      });
      await Promise.all(
        newUserEmails.map((email) => {
          return sendSignupToOrganizationEmail({
            usernameOrEmail: email,
            team: { ...group.team, metadata: teamMetadataSchema.parse(group.team.metadata) },
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
        ...users.map((user) => {
          return [
            {
              userId: user.id,
              teamId: group.teamId,
              role: "MEMBER",
              accepted: true,
            },
            {
              userId: user.id,
              teamId: orgId,
              role: "MEMBER",
              accepted: true,
            },
          ];
        }),
      ],
      skipDuplicates: true,
    });

    // Send emails to new members
    const newMembers = users.filter((user) => !user.teams.find((team) => team.id === group.teamId));
    await Promise.all(
      newMembers
        .map((user) => {
          return [
            sendExistingUserTeamInviteEmails({
              currentUserName: inviter.name,
              currentUserTeamName: team?.name,
              existingUsersWithMembersips: autoJoinUsers,
              language: translation,
              isOrg: input.isOrg,
              teamId: team.id,
              isAutoJoin: true,
              currentUserParentTeamName: team?.parent?.name,
            }),
            createAProfileForAnExistingUser({
              user: user,
              organizationId: orgId,
            }),
          ];
        })
        .flat()
    );
  }
};

export default handleGroupEvents;
