import prisma from "@calcom/web/lib/prisma";

export * from "@calcom/app-store/_apps-playwright/lib/testUtils";
export async function cleanUpForms() {
  await prisma.app_RoutingForms_Form.deleteMany({
    where: {
      user: {
        username: process.env.APP_USER_NAME,
      },
    },
  });
}

export async function cleanUpSeededForm(formId: string) {
  return await prisma.app_RoutingForms_FormResponse.deleteMany({
    where: {
      formId,
    },
  });
}
