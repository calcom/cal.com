import { prisma } from "@calcom/prisma";

/**
 * Safe to call multiple times - it's idempotent.
 * Prevents race conditions which was causing falky tests
 */
export async function setupOrganizationSettings() {
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
}
