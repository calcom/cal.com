import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateTeamRoleInput } from "@/modules/organizations/teams/roles/inputs/create-team-role.input";
import { UpdateTeamRoleInput } from "@/modules/organizations/teams/roles/inputs/update-team-role.input";
import { CreateTeamRoleOutput } from "@/modules/organizations/teams/roles/outputs/create-team-role.output";
import { DeleteTeamRoleOutput } from "@/modules/organizations/teams/roles/outputs/delete-team-role.output";
import { GetAllTeamRolesOutput } from "@/modules/organizations/teams/roles/outputs/get-all-team-roles.output";
import { GetTeamRoleOutput } from "@/modules/organizations/teams/roles/outputs/get-team-role.output";
import { UpdateTeamRoleOutput } from "@/modules/organizations/teams/roles/outputs/update-team-role.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { FeaturesRepositoryFixture } from "test/fixtures/repository/features.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { RoleService } from "@calcom/platform-libraries/pbac";
import type { User, Team } from "@calcom/prisma/client";

describe("Organizations Roles Endpoints", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let membershipRepositoryFixture: MembershipRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let featuresRepositoryFixture: FeaturesRepositoryFixture;
  let roleService: RoleService;

  // Test users
  let legacyOrgAdminUser: User;
  let legacyOrgMemberUser: User;
  let pbacOrgUserWithRolePermission: User;
  let pbacOrgUserWithoutRolePermission: User;
  let nonOrgUser: User;

  // API Keys
  let legacyOrgAdminApiKey: string;
  let legacyOrgMemberApiKey: string;
  let pbacOrgUserWithRolePermissionApiKey: string;
  let pbacOrgUserWithoutRolePermissionApiKey: string;
  let nonOrgUserApiKey: string;

  // Organization and team
  let organization: Team;
  let team: Team;
  let pbacEnabledOrganization: Team;
  let pbacEnabledTeam: Team;

  const legacyOrgAdminEmail = `legacy-org-admin-${randomString()}@api.com`;
  const legacyOrgMemberEmail = `legacy-org-member-${randomString()}@api.com`;
  const pbacOrgUserWithRolePermissionEmail = `pbac-org-user-with-role-permission-${randomString()}@api.com`;
  const pbacOrgUserWithoutRolePermissionEmail = `pbac-org-user-without-role-permission-${randomString()}@api.com`;
  const nonOrgUserEmail = `non-org-user-${randomString()}@api.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, TokensModule],
    }).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
    featuresRepositoryFixture = new FeaturesRepositoryFixture(moduleRef);
    roleService = new RoleService();

    // Create test users
    legacyOrgAdminUser = await userRepositoryFixture.create({
      email: legacyOrgAdminEmail,
      username: legacyOrgAdminEmail,
    });

    legacyOrgMemberUser = await userRepositoryFixture.create({
      email: legacyOrgMemberEmail,
      username: legacyOrgMemberEmail,
    });

    pbacOrgUserWithRolePermission = await userRepositoryFixture.create({
      email: pbacOrgUserWithRolePermissionEmail,
      username: pbacOrgUserWithRolePermissionEmail,
    });

    pbacOrgUserWithoutRolePermission = await userRepositoryFixture.create({
      email: pbacOrgUserWithoutRolePermissionEmail,
      username: pbacOrgUserWithoutRolePermissionEmail,
    });

    nonOrgUser = await userRepositoryFixture.create({
      email: nonOrgUserEmail,
      username: nonOrgUserEmail,
    });

    // Create organizations and teams
    organization = await organizationsRepositoryFixture.create({
      name: `org-roles-test-${randomString()}`,
      isOrganization: true,
    });

    team = await teamRepositoryFixture.create({
      name: `team-roles-test-${randomString()}`,
      isOrganization: false,
      parent: { connect: { id: organization.id } },
    });

    pbacEnabledOrganization = await organizationsRepositoryFixture.create({
      name: `pbac-org-roles-test-${randomString()}`,
      isOrganization: true,
    });

    pbacEnabledTeam = await teamRepositoryFixture.create({
      name: `pbac-team-roles-test-${randomString()}`,
      isOrganization: false,
      parent: { connect: { id: pbacEnabledOrganization.id } },
    });

    await featuresRepositoryFixture.create({ slug: "pbac", enabled: true });
    await featuresRepositoryFixture.setTeamFeatureState(pbacEnabledTeam.id, "pbac", "enabled");

    // Create memberships
    await membershipRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: legacyOrgAdminUser.id } },
      team: { connect: { id: organization.id } },
    });

    await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: legacyOrgMemberUser.id } },
      team: { connect: { id: organization.id } },
    });

    const pbacOrgUserWithRolePermissionMembership = await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: pbacOrgUserWithRolePermission.id } },
      team: { connect: { id: pbacEnabledOrganization.id } },
    });

    const pbacOrgUserWithoutRolePermissionMembership = await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: pbacOrgUserWithoutRolePermission.id } },
      team: { connect: { id: pbacEnabledOrganization.id } },
    });

    const roleWithPermission = await roleService.createRole({
      name: "Role Manager",
      teamId: pbacEnabledOrganization.id,
      permissions: ["role.create", "role.read", "role.update", "role.delete"],
      type: "CUSTOM",
    });

    const roleWithoutPermission = await roleService.createRole({
      name: "Basic Role",
      teamId: pbacEnabledOrganization.id,
      permissions: ["booking.read"],
      type: "CUSTOM",
    });

    await roleService.assignRoleToMember(roleWithPermission.id, pbacOrgUserWithRolePermissionMembership.id);
    await roleService.assignRoleToMember(
      roleWithoutPermission.id,
      pbacOrgUserWithoutRolePermissionMembership.id
    );

    const { keyString: legacyOrgAdminKeyString } = await apiKeysRepositoryFixture.createApiKey(
      legacyOrgAdminUser.id,
      null
    );
    legacyOrgAdminApiKey = `cal_test_${legacyOrgAdminKeyString}`;

    const { keyString: legacyOrgMemberKeyString } = await apiKeysRepositoryFixture.createApiKey(
      legacyOrgMemberUser.id,
      null
    );
    legacyOrgMemberApiKey = `cal_test_${legacyOrgMemberKeyString}`;

    const { keyString: pbacOrgUserWithRolePermissionKeyString } = await apiKeysRepositoryFixture.createApiKey(
      pbacOrgUserWithRolePermission.id,
      null
    );
    pbacOrgUserWithRolePermissionApiKey = `cal_test_${pbacOrgUserWithRolePermissionKeyString}`;

    const { keyString: pbacOrgUserWithoutRolePermissionKeyString } =
      await apiKeysRepositoryFixture.createApiKey(pbacOrgUserWithoutRolePermission.id, null);
    pbacOrgUserWithoutRolePermissionApiKey = `cal_test_${pbacOrgUserWithoutRolePermissionKeyString}`;

    const { keyString: nonOrgUserKeyString } = await apiKeysRepositoryFixture.createApiKey(
      nonOrgUser.id,
      null
    );
    nonOrgUserApiKey = `cal_test_${nonOrgUserKeyString}`;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  describe("Role Creation Authorization", () => {
    describe("Positive Tests", () => {
      it("should allow role creation when organization has PBAC enabled and user has a create permission", async () => {
        const createRoleInput: CreateTeamRoleInput = {
          name: "Test Role PBAC",
          permissions: ["booking.read", "eventType.create"],
        };

        return request(app.getHttpServer())
          .post(`/v2/organizations/${pbacEnabledOrganization.id}/teams/${pbacEnabledTeam.id}/roles`)
          .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
          .send(createRoleInput)
          .expect(201)
          .then((response) => {
            const responseBody: CreateTeamRoleOutput = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.name).toEqual(createRoleInput.name);
            expect(responseBody.data.permissions).toEqual(createRoleInput.permissions);
            expect(responseBody.data.teamId).toEqual(pbacEnabledTeam.id);
          });
      });

      it("should allow role creation when organization does not have PBAC enabled and user is org admin", async () => {
        const createRoleInput: CreateTeamRoleInput = {
          name: "Test Role Legacy Admin",
          permissions: ["booking.read"],
        };

        return request(app.getHttpServer())
          .post(`/v2/organizations/${organization.id}/teams/${team.id}/roles`)
          .set("Authorization", `Bearer ${legacyOrgAdminApiKey}`)
          .send(createRoleInput)
          .expect(201)
          .then((response) => {
            const responseBody: CreateTeamRoleOutput = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.name).toEqual(createRoleInput.name);
            expect(responseBody.data.teamId).toEqual(team.id);
          });
      });
    });

    describe("Negative Tests", () => {
      it("should not allow role creation when organization has PBAC enabled but user has no role assigned", async () => {
        const createRoleInput: CreateTeamRoleInput = {
          name: "Test Role No Role",
          permissions: ["booking.read"],
        };

        const userWithNoRole = await userRepositoryFixture.create({
          email: `no-role-user-${randomString()}@api.com`,
          username: `no-role-user-${randomString()}@api.com`,
        });

        await membershipRepositoryFixture.create({
          role: "MEMBER",
          user: { connect: { id: userWithNoRole.id } },
          team: { connect: { id: pbacEnabledOrganization.id } },
        });

        const { keyString: noRoleKeyString } = await apiKeysRepositoryFixture.createApiKey(
          userWithNoRole.id,
          null
        );
        const noRoleApiKey = `cal_test_${noRoleKeyString}`;

        return request(app.getHttpServer())
          .post(`/v2/organizations/${pbacEnabledOrganization.id}/teams/${pbacEnabledTeam.id}/roles`)
          .set("Authorization", `Bearer ${noRoleApiKey}`)
          .send(createRoleInput)
          .expect(403);
      });

      it("should not allow role creation when organization has PBAC enabled but user role lacks required permission", async () => {
        const createRoleInput: CreateTeamRoleInput = {
          name: "Test Role No Permission",
          permissions: ["booking.read"],
        };

        return request(app.getHttpServer())
          .post(`/v2/organizations/${pbacEnabledOrganization.id}/teams/${pbacEnabledTeam.id}/roles`)
          .set("Authorization", `Bearer ${pbacOrgUserWithoutRolePermissionApiKey}`)
          .send(createRoleInput)
          .expect(403);
      });

      it("should not allow role creation when organization does not have PBAC enabled and user has no membership", async () => {
        const createRoleInput: CreateTeamRoleInput = {
          name: "Test Role No Membership",
          permissions: ["booking.read"],
        };

        return request(app.getHttpServer())
          .post(`/v2/organizations/${organization.id}/teams/${team.id}/roles`)
          .set("Authorization", `Bearer ${nonOrgUserApiKey}`)
          .send(createRoleInput)
          .expect(403);
      });

      it("should not allow role creation when organization does not have PBAC enabled and user has member membership (not admin)", async () => {
        const createRoleInput: CreateTeamRoleInput = {
          name: "Test Role Member Only",
          permissions: ["booking.read"],
        };

        return request(app.getHttpServer())
          .post(`/v2/organizations/${organization.id}/teams/${team.id}/roles`)
          .set("Authorization", `Bearer ${legacyOrgMemberApiKey}`)
          .send(createRoleInput)
          .expect(403);
      });
    });
  });

  describe("CRUD Role Endpoints", () => {
    let createdRoleId: string;

    it("should create a role", async () => {
      const createRoleInput: CreateTeamRoleInput = {
        name: "CRUD Test Role",
        permissions: ["booking.read", "eventType.create"],
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${pbacEnabledOrganization.id}/teams/${pbacEnabledTeam.id}/roles`)
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
        .send(createRoleInput)
        .expect(201)
        .then((response) => {
          const responseBody: CreateTeamRoleOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.name).toEqual(createRoleInput.name);
          expect(responseBody.data.permissions).toEqual(createRoleInput.permissions);
          expect(responseBody.data.teamId).toEqual(pbacEnabledTeam.id);
          createdRoleId = responseBody.data.id;
        });
    });

    it("should update role permissions and name", async () => {
      const updateRoleInput: UpdateTeamRoleInput = {
        name: "CRUD Test Role Updated",
        permissions: ["booking.read", "eventType.read"],
      };

      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/${pbacEnabledOrganization.id}/teams/${pbacEnabledTeam.id}/roles/${createdRoleId}`
        )
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
        .send(updateRoleInput)
        .expect(200)
        .then((response) => {
          const responseBody: UpdateTeamRoleOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(createdRoleId);
          expect(responseBody.data.name).toEqual(updateRoleInput.name);
          expect(responseBody.data.permissions).toEqual(updateRoleInput.permissions);
          expect(responseBody.data.teamId).toEqual(pbacEnabledTeam.id);
        });
    });

    it("should update only name and keep permissions unchanged", async () => {
      const updateNameOnly: UpdateTeamRoleInput = {
        name: "CRUD Test Role Renamed Only",
      };
      const expectedPermissions = ["booking.read", "eventType.read"]; // from previous update

      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/${pbacEnabledOrganization.id}/teams/${pbacEnabledTeam.id}/roles/${createdRoleId}`
        )
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
        .send(updateNameOnly)
        .expect(200)
        .then((response) => {
          const responseBody: UpdateTeamRoleOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(createdRoleId);
          expect(responseBody.data.name).toEqual(updateNameOnly.name);
          expect(responseBody.data.permissions).toEqual(expectedPermissions);
          expect(responseBody.data.teamId).toEqual(pbacEnabledTeam.id);
        });
    });

    it("should fetch the role", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/organizations/${pbacEnabledOrganization.id}/teams/${pbacEnabledTeam.id}/roles/${createdRoleId}`
        )
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
        .expect(200)
        .then((response) => {
          const responseBody: GetTeamRoleOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(createdRoleId);
          expect(responseBody.data.teamId).toEqual(pbacEnabledTeam.id);
        });
    });

    it("should fetch all roles", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${pbacEnabledOrganization.id}/teams/${pbacEnabledTeam.id}/roles`)
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
        .expect(200)
        .then((response) => {
          const responseBody: GetAllTeamRolesOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(Array.isArray(responseBody.data)).toBe(true);
          expect(responseBody.data.find((r) => r.id === createdRoleId)).toBeDefined();
          const created = responseBody.data.find((r) => r.id === createdRoleId);
          expect(created?.teamId).toEqual(pbacEnabledTeam.id);
        });
    });

    it("should delete the role", async () => {
      return request(app.getHttpServer())
        .delete(
          `/v2/organizations/${pbacEnabledOrganization.id}/teams/${pbacEnabledTeam.id}/roles/${createdRoleId}`
        )
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
        .expect(200)
        .then((response) => {
          const responseBody: DeleteTeamRoleOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(createdRoleId);
          expect(responseBody.data.teamId).toEqual(pbacEnabledTeam.id);
        });
    });
  });

  afterAll(async () => {
    try {
      await featuresRepositoryFixture.deleteTeamFeature(pbacEnabledTeam.id, "pbac");

      await teamRepositoryFixture.delete(team.id);
      await teamRepositoryFixture.delete(pbacEnabledTeam.id);

      await organizationsRepositoryFixture.delete(organization.id);
      await organizationsRepositoryFixture.delete(pbacEnabledOrganization.id);

      await userRepositoryFixture.deleteByEmail(legacyOrgAdminUser.email);
      await userRepositoryFixture.deleteByEmail(legacyOrgMemberUser.email);
      await userRepositoryFixture.deleteByEmail(pbacOrgUserWithRolePermission.email);
      await userRepositoryFixture.deleteByEmail(pbacOrgUserWithoutRolePermission.email);
      await userRepositoryFixture.deleteByEmail(nonOrgUser.email);

      try {
        await featuresRepositoryFixture.deleteBySlug("pbac");
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    } finally {
      await app.close();
    }
  });
});
