import { TeamRepository } from "@calcom/lib/server/repository/team";

/**
 * Global setup for integration tests
 * Runs once before all integration tests to seed org-admin state
 */
export default async function globalSetup() {
  console.log("[global-setup] Starting org-admin seeding");
  console.log("[global-setup] DATABASE_URL exists:", !!process.env.DATABASE_URL);

  const teamRepo = await TeamRepository.withGlobalPrisma();

  console.log("[global-setup] Looking for acme org...");
  const acmeOrg = await teamRepo.findOrganizationBySlug("acme");
  console.log("[global-setup] Found acme org:", !!acmeOrg, acmeOrg?.id);

  if (acmeOrg) {
    await teamRepo.upsertOrganizationSettings({
      organizationId: acmeOrg.id,
      isAdminAPIEnabled: true,
      orgAutoAcceptEmail: "acme.com",
    });
    console.log("[global-setup] Seeded acme org with isAdminAPIEnabled: true");
  } else {
    console.warn("[global-setup] WARNING: acme org not found!");
  }

  console.log("[global-setup] Looking for dunder-mifflin org...");
  const dunderOrg = await teamRepo.findOrganizationBySlug("dunder-mifflin");
  console.log("[global-setup] Found dunder-mifflin org:", !!dunderOrg, dunderOrg?.id);

  if (dunderOrg) {
    await teamRepo.upsertOrganizationSettings({
      organizationId: dunderOrg.id,
      isAdminAPIEnabled: false,
      orgAutoAcceptEmail: "dunder-mifflin.com",
    });
    console.log("[global-setup] Seeded dunder-mifflin org with isAdminAPIEnabled: false");
  } else {
    console.warn("[global-setup] WARNING: dunder-mifflin org not found!");
  }

  console.log("[global-setup] Org-admin seeding completed");

  return async () => {
    console.log("[global-setup] Teardown: disconnecting Prisma");
  };
}
