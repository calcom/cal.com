/**
 * Global setup for integration tests
 * Runs once before all integration tests to seed org-admin state
 */
export default async function globalSetup() {
  const module = await import("../lib/test-team-repository");
  const TestTeamRepository = module.TestTeamRepository;
  const teamRepo = await TestTeamRepository.withGlobalPrisma();

  const acmeOrg = await teamRepo.findOrganizationBySlug("acme");

  if (acmeOrg) {
    await teamRepo.upsertOrganizationSettings({
      organizationId: acmeOrg.id,
      isAdminAPIEnabled: true,
      orgAutoAcceptEmail: "acme.com",
    });

    await teamRepo.ensureMembership({
      userEmail: "owner1-acme@example.com",
      organizationId: acmeOrg.id,
      role: "OWNER",
      accepted: true,
    });

    for (let i = 0; i < 10; i++) {
      const memberEmail = `member${i}-acme@example.com`;
      const memberUsername = `member${i}-acme`;
      const memberName = `Member ${i}`;

      await teamRepo.ensureUser({
        email: memberEmail,
        username: memberUsername,
        name: memberName,
      });

      await teamRepo.ensureMembership({
        userEmail: memberEmail,
        organizationId: acmeOrg.id,
        role: "MEMBER",
        accepted: true,
      });
    }
  }

  const dunderOrg = await teamRepo.findOrganizationBySlug("dunder-mifflin");

  if (dunderOrg) {
    await teamRepo.upsertOrganizationSettings({
      organizationId: dunderOrg.id,
      isAdminAPIEnabled: false,
      orgAutoAcceptEmail: "dunder-mifflin.com",
    });
  }

  return async () => {
  };
}
