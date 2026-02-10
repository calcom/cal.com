import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { RoleService } from "@calcom/platform-libraries/pbac";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { FeaturesRepositoryFixture } from "test/fixtures/repository/features.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PbacGuard } from "@/modules/auth/guards/pbac/pbac.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { CreateOrgRoleInput } from "@/modules/organizations/roles/inputs/create-org-role.input";
import { UpdateOrgRoleInput } from "@/modules/organizations/roles/inputs/update-org-role.input";
import { CreateOrgRoleOutput } from "@/modules/organizations/roles/outputs/create-org-role.output";
import { DeleteOrgRoleOutput } from "@/modules/organizations/roles/outputs/delete-org-role.output";
import { GetAllOrgRolesOutput } from "@/modules/organizations/roles/outputs/get-all-org-roles.output";
import { GetOrgRoleOutput } from "@/modules/organizations/roles/outputs/get-org-role.output";
import { UpdateOrgRoleOutput } from "@/modules/organizations/roles/outputs/update-org-role.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Organizations Roles Endpoints", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
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

  // Organization
  let organization: Team;
  let pbacEnabledOrganization: Team;

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

    // Create organizations
    organization = await organizationsRepositoryFixture.create({
      name: `org-roles-test-${randomString()}`,
      isOrganization: true,
    });

    pbacEnabledOrganization = await organizationsRepositoryFixture.create({
      name: `pbac-org-roles-test-${randomString()}`,
      isOrganization: true,
    });

    await featuresRepositoryFixture.create({ slug: "pbac", enabled: true });
    await featuresRepositoryFixture.setTeamFeatureState({
      teamId: pbacEnabledOrganization.id,
      featureId: "pbac",
      state: "enabled",
    });

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
    beforeEach(() => {
      jest.restoreAllMocks();
    });

    describe("Positive Tests", () => {
      it("should allow role creation when organization has PBAC enabled and user has a create permission", async () => {
        const createRoleInput: CreateOrgRoleInput = {
          name: "Test Role PBAC",
          permissions: ["booking.read", "eventType.create"],
        };

        const pbacSpyCanActivate = jest.spyOn(PbacGuard.prototype, "canActivate");
        const pbacSpyHasPbacEnabled = jest.spyOn(
          PbacGuard.prototype as unknown as PbacGuard,
          "hasPbacEnabled"
        );

        const rolesSpyCanActivate = jest.spyOn(RolesGuard.prototype, "canActivate");
        const rolesSpyCheckUserRoleAccess = jest.spyOn(
          RolesGuard.prototype as unknown as RolesGuard,
          "checkUserRoleAccess"
        );

        return request(app.getHttpServer())
          .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
          .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
          .send(createRoleInput)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateOrgRoleOutput = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.name).toEqual(createRoleInput.name);
            expect(responseBody.data.permissions).toEqual(createRoleInput.permissions);
            expect(responseBody.data.organizationId).toEqual(pbacEnabledOrganization.id);

            expect(pbacSpyCanActivate).toHaveBeenCalled();
            expect(pbacSpyHasPbacEnabled).toHaveBeenCalled();
            expect(rolesSpyCanActivate).toHaveBeenCalled();
            const pbacCanActivateResult = await pbacSpyCanActivate.mock.results[0].value;
            const rolesCanActivateResult = await rolesSpyCanActivate.mock.results[0].value;
            const hasPbac = await pbacSpyHasPbacEnabled.mock.results[0].value;
            expect(pbacCanActivateResult).toBe(true);
            expect(rolesCanActivateResult).toBe(true);
            expect(hasPbac).toBe(true);
            expect(rolesSpyCheckUserRoleAccess).not.toHaveBeenCalled();
          });
      });

      it("should allow role creation when organization does not have PBAC enabled and user is org admin", async () => {
        const createRoleInput: CreateOrgRoleInput = {
          name: "Test Role Legacy Admin",
          permissions: ["booking.read"],
        };

        const pbacSpyCanActivate = jest.spyOn(PbacGuard.prototype, "canActivate");
        const pbacSpyHasPbacEnabled = jest.spyOn(
          PbacGuard.prototype as unknown as PbacGuard,
          "hasPbacEnabled"
        );
        const rolesSpyCanActivate = jest.spyOn(RolesGuard.prototype, "canActivate");
        const rolesSpyCheckUserRoleAccess = jest.spyOn(
          RolesGuard.prototype as unknown as RolesGuard,
          "checkUserRoleAccess"
        );

        return request(app.getHttpServer())
          .post(`/v2/organizations/${organization.id}/roles`)
          .set("Authorization", `Bearer ${legacyOrgAdminApiKey}`)
          .send(createRoleInput)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateOrgRoleOutput = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.name).toEqual(createRoleInput.name);
            expect(responseBody.data.organizationId).toEqual(organization.id);

            expect(pbacSpyCanActivate).toHaveBeenCalled();
            expect(rolesSpyCanActivate).toHaveBeenCalled();
            expect(pbacSpyHasPbacEnabled).toHaveBeenCalled();
            const pbacCanActivateResult = await pbacSpyCanActivate.mock.results[0].value;
            const rolesCanActivateResult = await rolesSpyCanActivate.mock.results[0].value;
            const hasPbac = await pbacSpyHasPbacEnabled.mock.results[0].value;
            expect(pbacCanActivateResult).toBe(true);
            expect(rolesCanActivateResult).toBe(true);
            expect(hasPbac).toBe(false);
            expect(rolesSpyCheckUserRoleAccess).toHaveBeenCalled();
          });
      });
    });

    describe("Negative Tests", () => {
      it("should not allow role creation when organization has PBAC enabled but user has no role assigned", async () => {
        const createRoleInput: CreateOrgRoleInput = {
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

        const response = await request(app.getHttpServer())
          .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
          .set("Authorization", `Bearer ${noRoleApiKey}`)
          .send(createRoleInput);
        expect(response.status).toBe(403);
        expect(response.body.error.message).toBe(
          `RolesGuard - user with id=${userWithNoRole.id} does not have the minimum required role=ORG_ADMIN within organization with id=${pbacEnabledOrganization.id}.`
        );
      });

      it("should not allow role creation when organization has PBAC enabled but user role lacks required permission", async () => {
        const createRoleInput: CreateOrgRoleInput = {
          name: "Test Role No Permission",
          permissions: ["booking.read"],
        };

        const response = await request(app.getHttpServer())
          .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
          .set("Authorization", `Bearer ${pbacOrgUserWithoutRolePermissionApiKey}`)
          .send(createRoleInput);
        expect(response.status).toBe(403);
        expect(response.body.error.message).toBe(
          `RolesGuard - user with id=${pbacOrgUserWithoutRolePermission.id} does not have the minimum required role=ORG_ADMIN within organization with id=${pbacEnabledOrganization.id}.`
        );
      });

      it("should not allow role creation when organization does not have PBAC enabled and user has no membership", async () => {
        const createRoleInput: CreateOrgRoleInput = {
          name: "Test Role No Membership",
          permissions: ["booking.read"],
        };

        const response = await request(app.getHttpServer())
          .post(`/v2/organizations/${organization.id}/roles`)
          .set("Authorization", `Bearer ${nonOrgUserApiKey}`)
          .send(createRoleInput);
        expect(response.status).toBe(403);
        expect(response.body.error.message).toBe(
          `RolesGuard - User is not a member of the organization with id=${organization.id}.`
        );
      });

      it("should not allow role creation when organization does not have PBAC enabled and user has member membership (not admin)", async () => {
        const createRoleInput: CreateOrgRoleInput = {
          name: "Test Role Member Only",
          permissions: ["booking.read"],
        };

        const response = await request(app.getHttpServer())
          .post(`/v2/organizations/${organization.id}/roles`)
          .set("Authorization", `Bearer ${legacyOrgMemberApiKey}`)
          .send(createRoleInput);
        expect(response.status).toBe(403);
        expect(response.body.error.message).toBe(
          `RolesGuard - user with id=${legacyOrgMemberUser.id} does not have the minimum required role=ORG_ADMIN within organization with id=${organization.id}.`
        );
      });
    });

    describe("CRUD Role Endpoints", () => {
      let createdRoleId: string;

      it("should create a role", async () => {
        const createRoleInput: CreateOrgRoleInput = {
          name: "CRUD Test Role",
          permissions: ["booking.read", "eventType.create"],
        };

        return request(app.getHttpServer())
          .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
          .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
          .send(createRoleInput)
          .expect(201)
          .then((response) => {
            const responseBody: CreateOrgRoleOutput = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.name).toEqual(createRoleInput.name);
            expect(responseBody.data.permissions).toEqual(createRoleInput.permissions);
            expect(responseBody.data.organizationId).toEqual(pbacEnabledOrganization.id);
            createdRoleId = responseBody.data.id;
          });
      });

      it("should update role permissions and name", async () => {
        const updateRoleInput: UpdateOrgRoleInput = {
          name: "CRUD Test Role Updated",
          permissions: ["booking.read", "eventType.read"],
        };

        return request(app.getHttpServer())
          .patch(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${createdRoleId}`)
          .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
          .send(updateRoleInput)
          .expect(200)
          .then((response) => {
            const responseBody: UpdateOrgRoleOutput = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data.id).toEqual(createdRoleId);
            expect(responseBody.data.name).toEqual(updateRoleInput.name);
            expect(responseBody.data.permissions).toEqual(updateRoleInput.permissions);
            expect(responseBody.data.organizationId).toEqual(pbacEnabledOrganization.id);
          });
      });

      it("should fetch the role", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${createdRoleId}`)
          .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
          .expect(200)
          .then((response) => {
            const responseBody: GetOrgRoleOutput = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data.id).toEqual(createdRoleId);
            expect(responseBody.data.organizationId).toEqual(pbacEnabledOrganization.id);
          });
      });

      it("should fetch all roles", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
          .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
          .expect(200)
          .then((response) => {
            const responseBody: GetAllOrgRolesOutput = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(Array.isArray(responseBody.data)).toBe(true);
            expect(responseBody.data.find((r) => r.id === createdRoleId)).toBeDefined();
            const created = responseBody.data.find((r) => r.id === createdRoleId);
            expect(created?.organizationId).toEqual(pbacEnabledOrganization.id);
          });
      });

      it("should delete the role", async () => {
        return request(app.getHttpServer())
          .delete(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${createdRoleId}`)
          .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
          .expect(200)
          .then((response) => {
            const responseBody: DeleteOrgRoleOutput = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data.id).toEqual(createdRoleId);
            expect(responseBody.data.organizationId).toEqual(pbacEnabledOrganization.id);
          });
      });

      describe("Negative error cases", () => {
        it("should fail to create a role with a duplicate name (400)", async () => {
          const name = `dup-role-${randomString()}`;

          const firstCreate: CreateOrgRoleInput = { name, permissions: ["booking.read"] };
          await request(app.getHttpServer())
            .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
            .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
            .send(firstCreate)
            .expect(201);

          const secondCreate: CreateOrgRoleInput = { name, permissions: ["booking.read"] };
          const response = await request(app.getHttpServer())
            .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
            .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
            .send(secondCreate);
          expect(response.status).toBe(400);
          expect(response.body.error.message).toBe(`Role with name "${name}" already exists`);
        });

        it("should fail to create a role with invalid permissions (400)", async () => {
          const createRoleInput = {
            name: `invalid-perms-${randomString()}`,
            permissions: ["invalid"],
          };

          const response = await request(app.getHttpServer())
            .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
            .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
            .send(createRoleInput);
          expect(response.status).toBe(400);
          expect(response.body.error.message).toBe(
            "Permission 'invalid' must be a valid permission string in format 'resource.action' (e.g., 'eventType.read', 'booking.create')"
          );
        });

        it("should return 404 when updating a role not belonging to the organization", async () => {
          const defaultAdminRoleId = await roleService.getDefaultRoleId(MembershipRole.ADMIN);
          const updateRoleInput: UpdateOrgRoleInput = {
            name: `no-update-default-${randomString()}`,
            permissions: ["booking.read"],
          };

          const response = await request(app.getHttpServer())
            .patch(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${defaultAdminRoleId}`)
            .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
            .send(updateRoleInput);
          expect(response.status).toBe(404);
          expect(response.body.error.message).toBe(
            `Role with id ${defaultAdminRoleId} within team id ${pbacEnabledOrganization.id} not found`
          );
        });

        it("should return 404 when updating a default (system) role not belonging to the organization", async () => {
          const defaultAdminRoleId = await roleService.getDefaultRoleId(MembershipRole.ADMIN);
          const updateRoleInput: UpdateOrgRoleInput = {
            name: `no-update-default-${randomString()}`,
            permissions: ["booking.read"],
          };

          const response = await request(app.getHttpServer())
            .patch(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${defaultAdminRoleId}`)
            .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
            .send(updateRoleInput);
          expect(response.status).toBe(404);
          expect(response.body.error.message).toBe(
            `Role with id ${defaultAdminRoleId} within team id ${pbacEnabledOrganization.id} not found`
          );
        });

        it("should fail to update with invalid permissions (400)", async () => {
          // Create a fresh role to update
          const { body: createRes } = await request(app.getHttpServer())
            .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
            .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
            .send({ name: `update-invalid-${randomString()}` as string, permissions: ["booking.read"] })
            .expect(201);
          const roleId: string = createRes.data.id;

          const updateRoleInput = {
            name: `update-invalid-${randomString()}`,
            permissions: ["invalid"],
          };

          const response = await request(app.getHttpServer())
            .patch(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${roleId}`)
            .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
            .send(updateRoleInput);
          expect(response.status).toBe(400);
          expect(response.body.error.message).toBe(
            "Permission 'invalid' must be a valid permission string in format 'resource.action' (e.g., 'eventType.read', 'booking.create')"
          );
        });

        it("should return 404 when updating a role from a different organization", async () => {
          // Create a role in a different org (legacy/non-PBAC org)
          const foreignRole = await roleService.createRole({
            name: `foreign-update-${randomString()}`,
            teamId: organization.id,
            permissions: ["booking.read"],
            type: "CUSTOM",
          });

          const response = await request(app.getHttpServer())
            .patch(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${foreignRole.id}`)
            .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
            .send({ permissions: ["eventType.read"] });
          expect(response.status).toBe(404);
          expect(response.body.error.message).toBe(
            `Role with id ${foreignRole.id} within team id ${pbacEnabledOrganization.id} not found`
          );
        });

        it("should return 404 when deleting a role not belonging to the organization", async () => {
          const defaultMemberRoleId = await roleService.getDefaultRoleId(MembershipRole.MEMBER);
          const response = await request(app.getHttpServer())
            .delete(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${defaultMemberRoleId}`)
            .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`);
          expect(response.status).toBe(404);
          expect(response.body.error.message).toBe(
            `Role with id ${defaultMemberRoleId} within team id ${pbacEnabledOrganization.id} not found`
          );
        });

        it("should return 404 when deleting a default (system) role not belonging to the organization", async () => {
          const defaultMemberRoleId = await roleService.getDefaultRoleId(MembershipRole.MEMBER);
          const response = await request(app.getHttpServer())
            .delete(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${defaultMemberRoleId}`)
            .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`);
          expect(response.status).toBe(404);
          expect(response.body.error.message).toBe(
            `Role with id ${defaultMemberRoleId} within team id ${pbacEnabledOrganization.id} not found`
          );
        });

        it("should return 404 when deleting a role from a different organization", async () => {
          // Create a role in a different org
          const foreignRole = await roleService.createRole({
            name: `foreign-delete-${randomString()}`,
            teamId: organization.id,
            permissions: ["booking.read"],
            type: "CUSTOM",
          });

          const response = await request(app.getHttpServer())
            .delete(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${foreignRole.id}`)
            .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`);
          expect(response.status).toBe(404);
          expect(response.body.error.message).toBe(
            `Role with id ${foreignRole.id} within team id ${pbacEnabledOrganization.id} not found`
          );
        });
      });
    });
  });

  afterAll(async () => {
    try {
      await featuresRepositoryFixture.deleteTeamFeature(pbacEnabledOrganization.id, "pbac");

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
