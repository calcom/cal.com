import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { RoleService } from "@calcom/platform-libraries/pbac";
import type { Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { FeaturesRepositoryFixture } from "test/fixtures/repository/features.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PbacGuard } from "@/modules/auth/guards/pbac/pbac.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

/**
 * This E2E spec validates that the PbacGuard is correctly wired into organization
 * and organization-team endpoints. It tests the guard interaction (PBAC + RolesGuard)
 * rather than business logic of individual endpoints.
 *
 * We pick representative endpoints from org-level and team-level controllers:
 *  - GET /v2/organizations/:orgId/memberships  (org-level, organization.listMembers)
 *  - GET /v2/organizations/:orgId/teams        (org-level, team.read)
 *  - GET /v2/organizations/:orgId/teams/:teamId/memberships (team-level, team.listMembers)
 */
describe("Organizations PBAC Guard E2E", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let membershipRepositoryFixture: MembershipRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let featuresRepositoryFixture: FeaturesRepositoryFixture;
  let roleService: RoleService;

  // Legacy org (no PBAC)
  let legacyOrg: Team;
  let legacyOrgAdmin: User;
  let legacyOrgAdminApiKey: string;
  let legacyOrgMember: User;
  let legacyOrgMemberApiKey: string;

  // PBAC-enabled org
  let pbacOrg: Team;
  let pbacTeam: Team;
  let pbacUserWithPermission: User;
  let pbacUserWithPermissionApiKey: string;
  let pbacUserWithoutPermission: User;
  let pbacUserWithoutPermissionApiKey: string;
  let pbacUserNoRole: User;
  let pbacUserNoRoleApiKey: string;

  // Non-org user
  let nonOrgUser: User;
  let nonOrgUserApiKey: string;

  const emails = {
    legacyAdmin: `pbac-e2e-legacy-admin-${randomString()}@api.com`,
    legacyMember: `pbac-e2e-legacy-member-${randomString()}@api.com`,
    pbacWithPerm: `pbac-e2e-with-perm-${randomString()}@api.com`,
    pbacWithoutPerm: `pbac-e2e-without-perm-${randomString()}@api.com`,
    pbacNoRole: `pbac-e2e-no-role-${randomString()}@api.com`,
    nonOrg: `pbac-e2e-non-org-${randomString()}@api.com`,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, TokensModule],
    }).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
    membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
    featuresRepositoryFixture = new FeaturesRepositoryFixture(moduleRef);
    roleService = new RoleService();

    // --- Create users ---
    legacyOrgAdmin = await userRepositoryFixture.create({
      email: emails.legacyAdmin,
      username: emails.legacyAdmin,
    });
    legacyOrgMember = await userRepositoryFixture.create({
      email: emails.legacyMember,
      username: emails.legacyMember,
    });
    pbacUserWithPermission = await userRepositoryFixture.create({
      email: emails.pbacWithPerm,
      username: emails.pbacWithPerm,
    });
    pbacUserWithoutPermission = await userRepositoryFixture.create({
      email: emails.pbacWithoutPerm,
      username: emails.pbacWithoutPerm,
    });
    pbacUserNoRole = await userRepositoryFixture.create({
      email: emails.pbacNoRole,
      username: emails.pbacNoRole,
    });
    nonOrgUser = await userRepositoryFixture.create({
      email: emails.nonOrg,
      username: emails.nonOrg,
    });

    // --- Create legacy org ---
    legacyOrg = await organizationsRepositoryFixture.create({
      name: `pbac-e2e-legacy-org-${randomString()}`,
      isOrganization: true,
    });

    await membershipRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: legacyOrgAdmin.id } },
      team: { connect: { id: legacyOrg.id } },
    });
    await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: legacyOrgMember.id } },
      team: { connect: { id: legacyOrg.id } },
    });

    // --- Create PBAC org ---
    pbacOrg = await organizationsRepositoryFixture.create({
      name: `pbac-e2e-pbac-org-${randomString()}`,
      isOrganization: true,
    });

    await featuresRepositoryFixture.create({ slug: "pbac", enabled: true });
    await featuresRepositoryFixture.setTeamFeatureState({
      teamId: pbacOrg.id,
      featureId: "pbac",
      state: "enabled",
    });

    // Create a team inside the PBAC org
    pbacTeam = await teamRepositoryFixture.create({
      name: `pbac-e2e-team-${randomString()}`,
      isOrganization: false,
      parent: { connect: { id: pbacOrg.id } },
    });

    // PBAC org memberships
    const withPermMembership = await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: pbacUserWithPermission.id } },
      team: { connect: { id: pbacOrg.id } },
    });
    const withoutPermMembership = await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: pbacUserWithoutPermission.id } },
      team: { connect: { id: pbacOrg.id } },
    });
    await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: pbacUserNoRole.id } },
      team: { connect: { id: pbacOrg.id } },
    });

    // Team memberships for team-level endpoints
    await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: pbacUserWithPermission.id } },
      team: { connect: { id: pbacTeam.id } },
    });
    await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: pbacUserWithoutPermission.id } },
      team: { connect: { id: pbacTeam.id } },
    });

    // --- Create roles with permissions ---
    const roleWithOrgAndTeamPerms = await roleService.createRole({
      name: `pbac-e2e-full-${randomString()}`,
      teamId: pbacOrg.id,
      permissions: [
        "organization.listMembers",
        "organization.invite",
        "organization.changeMemberRole",
        "organization.remove",
        "team.read",
        "team.create",
        "team.update",
        "team.delete",
        "team.listMembers",
      ],
      type: "CUSTOM",
    });

    const roleWithMinimalPerms = await roleService.createRole({
      name: `pbac-e2e-minimal-${randomString()}`,
      teamId: pbacOrg.id,
      permissions: ["booking.read"],
      type: "CUSTOM",
    });

    await roleService.assignRoleToMember(roleWithOrgAndTeamPerms.id, withPermMembership.id);
    await roleService.assignRoleToMember(roleWithMinimalPerms.id, withoutPermMembership.id);

    // --- Create API keys ---
    const createKey = async (userId: number) => {
      const { keyString } = await apiKeysRepositoryFixture.createApiKey(userId, null);
      return `cal_test_${keyString}`;
    };

    legacyOrgAdminApiKey = await createKey(legacyOrgAdmin.id);
    legacyOrgMemberApiKey = await createKey(legacyOrgMember.id);
    pbacUserWithPermissionApiKey = await createKey(pbacUserWithPermission.id);
    pbacUserWithoutPermissionApiKey = await createKey(pbacUserWithoutPermission.id);
    pbacUserNoRoleApiKey = await createKey(pbacUserNoRole.id);
    nonOrgUserApiKey = await createKey(nonOrgUser.id);

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  afterAll(async () => {
    try {
      await featuresRepositoryFixture.deleteTeamFeature(pbacOrg.id, "pbac");
      await organizationsRepositoryFixture.delete(pbacOrg.id);
      await organizationsRepositoryFixture.delete(legacyOrg.id);

      for (const email of Object.values(emails)) {
        await userRepositoryFixture.deleteByEmail(email);
      }

      try {
        await featuresRepositoryFixture.deleteBySlug("pbac");
      } catch {
        // may already be deleted by another test
      }
    } catch (error) {
      console.error("PBAC E2E cleanup error:", error);
    } finally {
      await app.close();
    }
  });

  // -------------------------------------------------------------------
  // Organization-level endpoint: GET /v2/organizations/:orgId/memberships
  // Requires: @Pbac(["organization.listMembers"]) + @Roles("ORG_ADMIN")
  // -------------------------------------------------------------------
  describe("Org-level: GET /v2/organizations/:orgId/memberships", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
    });

    it("should allow access when PBAC enabled and user has organization.listMembers permission", async () => {
      const pbacSpy = jest.spyOn(PbacGuard.prototype, "canActivate");
      const rolesSpy = jest.spyOn(RolesGuard.prototype, "canActivate");

      const response = await request(app.getHttpServer())
        .get(`/v2/organizations/${pbacOrg.id}/memberships`)
        .set("Authorization", `Bearer ${pbacUserWithPermissionApiKey}`)
        .expect(200);

      expect(response.body.status).toEqual(SUCCESS_STATUS);
      expect(Array.isArray(response.body.data)).toBe(true);

      expect(pbacSpy).toHaveBeenCalled();
      expect(rolesSpy).toHaveBeenCalled();
      const pbacResult = await pbacSpy.mock.results[0].value;
      expect(pbacResult).toBe(true);
    });

    it("should allow access on legacy org when user is admin (PBAC disabled)", async () => {
      const pbacSpyHasPbac = jest.spyOn(PbacGuard.prototype as unknown as PbacGuard, "hasPbacEnabled");

      const response = await request(app.getHttpServer())
        .get(`/v2/organizations/${legacyOrg.id}/memberships`)
        .set("Authorization", `Bearer ${legacyOrgAdminApiKey}`)
        .expect(200);

      expect(response.body.status).toEqual(SUCCESS_STATUS);
      const hasPbac = await pbacSpyHasPbac.mock.results[0].value;
      expect(hasPbac).toBe(false);
    });

    it("should deny access when PBAC enabled but user lacks required permission", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/organizations/${pbacOrg.id}/memberships`)
        .set("Authorization", `Bearer ${pbacUserWithoutPermissionApiKey}`);

      expect(response.status).toBe(403);
    });

    it("should deny access when PBAC enabled but user has no role assigned", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/organizations/${pbacOrg.id}/memberships`)
        .set("Authorization", `Bearer ${pbacUserNoRoleApiKey}`);

      expect(response.status).toBe(403);
    });

    it("should deny access on legacy org when user is member (not admin)", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/organizations/${legacyOrg.id}/memberships`)
        .set("Authorization", `Bearer ${legacyOrgMemberApiKey}`);

      expect(response.status).toBe(403);
    });

    it("should deny access when user is not a member of the org", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/organizations/${legacyOrg.id}/memberships`)
        .set("Authorization", `Bearer ${nonOrgUserApiKey}`);

      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------
  // Org-level team endpoint: GET /v2/organizations/:orgId/teams
  // Requires: @Pbac(["team.read"]) + @Roles("ORG_ADMIN")
  // -------------------------------------------------------------------
  describe("Org-level: GET /v2/organizations/:orgId/teams", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
    });

    it("should allow access when PBAC enabled and user has team.read permission", async () => {
      const pbacSpy = jest.spyOn(PbacGuard.prototype, "canActivate");

      const response = await request(app.getHttpServer())
        .get(`/v2/organizations/${pbacOrg.id}/teams`)
        .set("Authorization", `Bearer ${pbacUserWithPermissionApiKey}`)
        .expect(200);

      expect(response.body.status).toEqual(SUCCESS_STATUS);

      expect(pbacSpy).toHaveBeenCalled();
      const pbacResult = await pbacSpy.mock.results[0].value;
      expect(pbacResult).toBe(true);
    });

    it("should allow access on legacy org when user is admin", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/organizations/${legacyOrg.id}/teams`)
        .set("Authorization", `Bearer ${legacyOrgAdminApiKey}`)
        .expect(200);

      expect(response.body.status).toEqual(SUCCESS_STATUS);
    });

    it("should deny access when PBAC enabled but user lacks team.read permission", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/organizations/${pbacOrg.id}/teams`)
        .set("Authorization", `Bearer ${pbacUserWithoutPermissionApiKey}`);

      expect(response.status).toBe(403);
    });

    it("should deny access on legacy org when user is member (not admin)", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/organizations/${legacyOrg.id}/teams`)
        .set("Authorization", `Bearer ${legacyOrgMemberApiKey}`);

      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------
  // Team-level endpoint: GET /v2/organizations/:orgId/teams/:teamId/memberships
  // Requires: @Pbac(["team.listMembers"]) + @Roles("TEAM_ADMIN")
  // -------------------------------------------------------------------
  describe("Team-level: GET /v2/organizations/:orgId/teams/:teamId/memberships", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
    });

    it("should allow access when PBAC enabled and user has team.listMembers permission", async () => {
      const pbacSpy = jest.spyOn(PbacGuard.prototype, "canActivate");

      const response = await request(app.getHttpServer())
        .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/memberships`)
        .set("Authorization", `Bearer ${pbacUserWithPermissionApiKey}`)
        .expect(200);

      expect(response.body.status).toEqual(SUCCESS_STATUS);

      expect(pbacSpy).toHaveBeenCalled();
      const pbacResult = await pbacSpy.mock.results[0].value;
      expect(pbacResult).toBe(true);
    });

    it("should deny access when PBAC enabled but user lacks required permission", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/memberships`)
        .set("Authorization", `Bearer ${pbacUserWithoutPermissionApiKey}`);

      expect(response.status).toBe(403);
    });

    it("should deny access when user is not a member of the org", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/memberships`)
        .set("Authorization", `Bearer ${nonOrgUserApiKey}`);

      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------
  // Guard interaction validation
  // -------------------------------------------------------------------
  describe("Guard interaction: PbacGuard sets flag for RolesGuard", () => {
    beforeEach(() => {
      jest.restoreAllMocks();
    });

    it("should set pbacAuthorizedRequest=true and skip RolesGuard role check when PBAC authorizes", async () => {
      const pbacSpy = jest.spyOn(PbacGuard.prototype, "canActivate");
      const rolesCheckSpy = jest.spyOn(
        RolesGuard.prototype as unknown as RolesGuard,
        "checkUserRoleAccess"
      );

      await request(app.getHttpServer())
        .get(`/v2/organizations/${pbacOrg.id}/memberships`)
        .set("Authorization", `Bearer ${pbacUserWithPermissionApiKey}`)
        .expect(200);

      expect(pbacSpy).toHaveBeenCalled();
      expect(rolesCheckSpy).not.toHaveBeenCalled();
    });

    it("should fall back to RolesGuard role check when PBAC is not enabled", async () => {
      const pbacSpyHasPbac = jest.spyOn(PbacGuard.prototype as unknown as PbacGuard, "hasPbacEnabled");
      const rolesCheckSpy = jest.spyOn(
        RolesGuard.prototype as unknown as RolesGuard,
        "checkUserRoleAccess"
      );

      await request(app.getHttpServer())
        .get(`/v2/organizations/${legacyOrg.id}/memberships`)
        .set("Authorization", `Bearer ${legacyOrgAdminApiKey}`)
        .expect(200);

      const hasPbac = await pbacSpyHasPbac.mock.results[0].value;
      expect(hasPbac).toBe(false);
      expect(rolesCheckSpy).toHaveBeenCalled();
    });
  });
});
