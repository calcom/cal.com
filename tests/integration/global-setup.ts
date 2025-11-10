/**
 * Global setup for integration tests
 * Runs once before all integration tests to seed org-admin state
 */
export default async function globalSetup() {
  console.log("[global-setup] Starting org-admin seeding");
  console.log("[global-setup] DATABASE_URL exists:", !!process.env.DATABASE_URL);

  const { prisma } = await import("@calcom/prisma");

  console.log("[global-setup] Looking for acme org...");
  const acmeOrg = await prisma.team.findFirst({
    where: {
      slug: "acme",
      isOrganization: true,
    },
  });
  console.log("[global-setup] Found acme org:", !!acmeOrg, acmeOrg?.id);

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
    console.log("[global-setup] Seeded acme org with isAdminAPIEnabled: true");
  } else {
    console.warn("[global-setup] WARNING: acme org not found!");
  }

  console.log("[global-setup] Looking for dunder-mifflin org...");
  const dunderOrg = await prisma.team.findFirst({
    where: {
      slug: "dunder-mifflin",
      isOrganization: true,
    },
  });
  console.log("[global-setup] Found dunder-mifflin org:", !!dunderOrg, dunderOrg?.id);

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
    console.log("[global-setup] Seeded dunder-mifflin org with isAdminAPIEnabled: false");
  } else {
    console.warn("[global-setup] WARNING: dunder-mifflin org not found!");
  }

  console.log("[global-setup] Org-admin seeding completed");

  return async () => {
    console.log("[global-setup] Teardown: disconnecting Prisma");
    try {
      await prisma.$disconnect();
    } catch (error) {
    }
  };
}
