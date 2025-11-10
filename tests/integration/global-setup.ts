/**
 * Global setup for integration tests
 * Runs once before all integration tests to seed org-admin state
 */
export default async function globalSetup() {
  console.log("[global-setup] Starting org-admin seeding");
  console.log("[global-setup] DATABASE_URL exists:", !!process.env.DATABASE_URL);

  let TeamRepository;
  try {
    const module = await import("../../packages/lib/server/repository/team");
    TeamRepository = module.TeamRepository;
    console.log("[global-setup] TeamRepository imported successfully");
  } catch (e) {
    console.error("[global-setup] Failed to import TeamRepository:", e);
    throw e;
  }

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

    const owner1Memberships = await teamRepo.findUserMembershipsInOrg({
      userEmail: "owner1-acme@example.com",
      organizationId: acmeOrg.id,
    });
    console.log(
      "[global-setup] owner1-acme@example.com memberships in acme org BEFORE ensure:",
      owner1Memberships.length,
      owner1Memberships.map((m) => ({ role: m.role, accepted: m.accepted }))
    );

    await teamRepo.ensureMembership({
      userEmail: "owner1-acme@example.com",
      organizationId: acmeOrg.id,
      role: "OWNER",
      accepted: true,
    });
    console.log("[global-setup] Ensured owner1-acme@example.com has OWNER membership with accepted: true");
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
