import type { App_RoutingForms_Form, User } from "@prisma/client";

import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

export async function isFormEditAllowed({
  userId,
  formId,
  teamId,
}: {
  userId: User["id"];
  formId: App_RoutingForms_Form["id"];
  teamId: App_RoutingForms_Form["teamId"];
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
  const userHasEditPermissionInTeam = teamId
    ? await prisma.team.findFirst({
        where: {
          id: teamId,
          members: {
            some: {
              userId,
              accepted: true,
              role: {
                in: [MembershipRole.ADMIN, MembershipRole.OWNER],
              },
            },
          },
        },
      })
    : null;

  if (!form) {
    // If form doesn't exist, then just check for which team it's being created.
    const creationAllowed = teamId ? userHasEditPermissionInTeam : true;
    return creationAllowed;
  }

  const isUserCreator = form.userId === userId;
  // If teamId is given then the user should have edit permission within that team, or user can be creator of the form himself
  const editAllowed = teamId ? userHasEditPermissionInTeam || isUserCreator : isUserCreator;

  return editAllowed;
}
