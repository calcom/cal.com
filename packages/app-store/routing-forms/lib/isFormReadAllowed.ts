import type { App_RoutingForms_Form, User } from "@prisma/client";

import prisma from "@calcom/prisma";

export async function getUsersTeamsPermissionsForForm({
  userIds,
  formId,
  teamIds,
}: {
  userIds: User["id"][];
  formId: App_RoutingForms_Form["id"];
  teamIds: App_RoutingForms_Form["teamId"][];
}) {
  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: formId,
    },
    select: {
      userId: true,
      teamId: true,
    },
  });

  if (!form) {
    // Form doesn't exist, what's there to read
    return true;
  }
  const validTeamIds = teamIds.filter((teamId): teamId is number => !!teamId);
  const matchingTeamsOfLoggedinUser = teamIds
    ? await prisma.team.findMany({
        where: {
          id: {
            in: validTeamIds,
          },
          members: {
            some: {
              userId: {
                in: userIds,
              },
              accepted: true,
            },
          },
        },
        select: {
          members: true,
        },
      })
    : null;

  const isUserCreator = userIds.includes(form.userId);

  return isUserCreator || matchingTeamsOfLoggedinUser;
}
