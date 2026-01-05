import { canCreateEntity, canEditEntity } from "@calcom/features/pbac/lib/entityPermissionUtils.server";
import prisma from "@calcom/prisma";
import type { App_RoutingForms_Form, User } from "@calcom/prisma/client";

export async function isFormCreateEditAllowed({
  formId,
  userId,
  /**
   * Valid when a new form is being created for a team
   */
  targetTeamId,
}: {
  userId: User["id"];
  formId: App_RoutingForms_Form["id"];
  targetTeamId: App_RoutingForms_Form["teamId"] | null;
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
    return await canCreateEntity({
      targetTeamId,
      userId,
    });
  }

  return await canEditEntity(form, userId);
}
