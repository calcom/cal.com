import type { App_RoutingForms_Form, User } from "@prisma/client";

import prisma from "@calcom/prisma";

export async function isFormEditAllowed({
  userId,
  formId,
}: {
  userId: User["id"];
  formId: App_RoutingForms_Form["id"];
}) {
  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: formId,
    },
    select: {
      userId: true,
    },
  });
  if (!form) {
    // If form doesn't exist at all, then it's a creation and can be allowed.
    return true;
  }
  return form.userId === userId;
}
