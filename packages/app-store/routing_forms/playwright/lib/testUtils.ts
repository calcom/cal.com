import prisma from "@calcom/web/lib/prisma";

export * from "../../../_apps-playwright/lib/testUtils";
export async function cleanUpForms() {
  await prisma.app_RoutingForms_Form.deleteMany({
    where: {
      user: {
        username: process.env.APP_USER_NAME,
      },
    },
  });
}
