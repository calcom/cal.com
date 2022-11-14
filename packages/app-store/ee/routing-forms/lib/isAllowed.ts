import prisma from "@calcom/prisma";

import { App_RoutingForms_Form, User } from ".prisma/client";

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

export async function isGlobalRouterEditAllowed({
  userId,
  routerId,
}: {
  userId: User["id"];
  routerId: App_RoutingForms_Form["id"];
}) {
  const router = await prisma.app_RoutingForms_Router.findUnique({
    where: {
      id: routerId,
    },
    select: {
      userId: true,
    },
  });
  if (!router) {
    // If router doesn't exist at all, then it's a creation and can be allowed.
    return true;
  }
  return router.userId === userId;
}
