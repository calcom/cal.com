import type { App_RoutingForms_Form, User } from "@prisma/client";

import { canCreateCalIdEntity, canEditCalIdEntity } from "@calcom/lib/calIdEntityPermissionUtils.server";
import prisma from "@calcom/prisma";

export async function isCalIdFormCreateEditAllowed({
  formId,
  userId,
  /**
   * Valid when a new form is being created for a calid team
   */
  targetCalIdTeamId,
}: {
  userId: User["id"];
  formId: App_RoutingForms_Form["id"];
  targetCalIdTeamId: App_RoutingForms_Form["calIdTeamId"] | null;
}) {
  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: formId,
    },
    select: {
      userId: true,
      calIdTeamId: true,
    },
  });

  if (!form) {
    return await canCreateCalIdEntity({
      targetCalIdTeamId,
      userId,
    });
  }

  return await canEditCalIdEntity(form, userId);
}
