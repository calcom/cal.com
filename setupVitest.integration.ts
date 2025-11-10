import { beforeAll } from "vitest";

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    return;
  }

  const { prisma } = await import("@calcom/prisma");

  const acmeOrg = await prisma.team.findFirst({
    where: {
      slug: "acme",
      isOrganization: true,
    },
  });

  if (acmeOrg) {
    await prisma.organizationSettings.upsert({
      where: {
        organizationId: acmeOrg.id,
      },
      update: {
        isAdminAPIEnabled: true,
      },
      create: {
        organizationId: acmeOrg.id,
        orgAutoAcceptEmail: "acme.com",
        isAdminAPIEnabled: true,
      },
    });
  }

  const dunderOrg = await prisma.team.findFirst({
    where: {
      slug: "dunder-mifflin",
      isOrganization: true,
    },
  });

  if (dunderOrg) {
    await prisma.organizationSettings.upsert({
      where: {
        organizationId: dunderOrg.id,
      },
      update: {
        isAdminAPIEnabled: false,
      },
      create: {
        organizationId: dunderOrg.id,
        orgAutoAcceptEmail: "dunder-mifflin.com",
        isAdminAPIEnabled: false,
      },
    });
  }
});
