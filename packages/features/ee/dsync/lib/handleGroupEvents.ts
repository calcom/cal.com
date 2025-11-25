import type { DirectorySyncEvent, Group } from "@boxyhq/saml-jackson";

import { addNewMembersToEventTypes } from "@calcom/features/ee/teams/lib/queries";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
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

const handleGroupEvents = async (event: DirectorySyncEvent, organizationId: number) => {
  const log = logger.getSubLogger({
    prefix: [`dsync/handleGroupEvents: directoryId: ${event.directory_id}`],
  });

  log.info(
    "called",
    safeStringify({
      event: event.event,
      tenant: event.tenant,
      product: event.product,
    })
  );
  // Find the group name associated with the event
  const eventData = event.data as Group;
  // If the group doesn't have any members assigned then return early
  if (!eventData.raw.members.length) {
    return;
  }

  log.info(`Event contains ${eventData.raw.members.length} members`);

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

  log.info(`Event contains ${userEmails.length} emails`);

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
  let newUsers;

  log.info(`Event processing ${newUserEmails.length} new users and ${users.length} existing users`);

  // For each team linked to the dsync group name provision members
  for (const group of groupNames) {
    if (newUserEmails.length) {
      const createUsersAndConnectToOrgProps = {
        emailsToCreate: newUserEmails,
        identityProvider: IdentityProvider.CAL,
        identityProviderId: null,
      };
      newUsers = await createUsersAndConnectToOrg({
        createUsersAndConnectToOrgProps,
        org,
      });
      await prisma.membership.createMany({
        data: newUsers.map((user) => ({
          createdAt: new Date(),
          userId: user.id,
          teamId: group.teamId,
          role: MembershipRole.MEMBER,
          accepted: true,
        })),
      });
      await Promise.allSettled(
        newUserEmails.map((email) => {
          return sendSignupToOrganizationEmail({
            usernameOrEmail: email,
            team: group.team,
            translation,
            inviterName: org.name,
            teamId: group.teamId,
            isOrg: false,
          }).catch((error) => {
            log.error(
              "Failed to send signup to organization email",
              safeStringify({
                email,
                organizationId,
                teamId: group.teamId,
              }),
              error
            );
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
                createdAt: new Date(),
                userId: user.id,
                teamId: group.teamId,
                role: MembershipRole.MEMBER,
                accepted: true,
              },
              {
                createdAt: new Date(),
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
    const newMembers = users.filter((user) => !user.teams.find((team) => team.teamId === group.teamId));
    const newOrgMembers = users.filter(
      (user) => !user.profiles.find((profile) => profile.organizationId === organizationId)
    );
    await Promise.allSettled([
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
        }).catch((error) => {
          log.error(
            "Failed to send team invite to existing user",
            safeStringify({
              email: user.email,
              organizationId,
              teamId: group.teamId,
            }),
            error
          );
        });
      }),
    ]);

    await ProfileRepository.createManyForExistingUsers({
      users: newOrgMembers,
      organizationId,
      orgAutoAcceptEmail: org.organizationSettings?.orgAutoAcceptEmail ?? "",
    });

    // Add users to team event types if assignAllTeamMembers is enabled
    await addNewMembersToEventTypes({
      userIds: [...(newUsers ? newUsers.map((user) => user.id) : []), ...users.map((user) => user.id)],
      teamId: group.teamId,
    });
  }
};

export default handleGroupEvents;
