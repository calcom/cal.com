import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateTeamRoleInput } from "@/modules/organizations/teams/roles/inputs/create-team-role.input";
import type { CreateTeamRoleOutput } from "@/modules/organizations/teams/roles/outputs/create-team-role.output";
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
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { RoleService } from "@calcom/platform-libraries/pbac";
import type { PermissionString } from "@calcom/platform-libraries/pbac";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

describe("Organizations Roles Permissions Endpoints", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let membershipRepositoryFixture: MembershipRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let featuresRepositoryFixture: FeaturesRepositoryFixture;
  let roleService: RoleService;

  let pbacOrgUserWithRolePermission: User;
  let pbacOrgUserWithRolePermissionApiKey: string;

  let pbacEnabledOrganization: Team;

  const pbacUserEmail = `pbac-org-user-with-permissions-${randomString()}@api.com`;

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

    // Create PBAC org
    pbacEnabledOrganization = await organizationsRepositoryFixture.create({
      name: `pbac-org-role-perm-test-${randomString()}`,
      isOrganization: true,
    });

    await featuresRepositoryFixture.create({ slug: "pbac", enabled: true });
    await featuresRepositoryFixture.setTeamFeatureState(pbacEnabledOrganization.id, "pbac", "enabled");

    // Create user + membership in org
    pbacOrgUserWithRolePermission = await userRepositoryFixture.create({
      email: pbacUserEmail,
      username: pbacUserEmail,
    });

    const membership = await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: pbacOrgUserWithRolePermission.id } },
      team: { connect: { id: pbacEnabledOrganization.id } },
    });

    // Create a role that allows role.read and role.update, assign to user
    const managerRole = await roleService.createRole({
      name: `role-manager-${randomString()}`,
      teamId: pbacEnabledOrganization.id,
      permissions: ["role.create", "role.read", "role.update"],
      type: "CUSTOM",
    });
    await roleService.assignRoleToMember(managerRole.id, membership.id);

    // API key for user
    const { keyString } = await apiKeysRepositoryFixture.createApiKey(pbacOrgUserWithRolePermission.id, null);
    pbacOrgUserWithRolePermissionApiKey = `cal_test_${keyString}`;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  describe("Negative Tests", () => {
    it("rejects invalid permission on add (400)", async () => {
      const baseRoleInput: CreateTeamRoleInput = {
        name: `neg-add-invalid-${randomString()}`,
        permissions: ["booking.read"],
      };
      const createRes = await request(app.getHttpServer())
        .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
        .send(baseRoleInput)
        .expect(201);
      const roleId = createRes.body.data.id as string;

      const response = await request(app.getHttpServer())
        .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${roleId}/permissions`)
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
        .send({ permissions: ["invalid"] });
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe(
        "Permission 'invalid' must be a valid permission string in format 'resource.action' (e.g., 'eventType.read', 'booking.create')"
      );
    });

    it("rejects invalid permission on replace (400)", async () => {
      const baseRoleInput: CreateTeamRoleInput = {
        name: `neg-put-invalid-${randomString()}`,
        permissions: ["booking.read"],
      };
      const createRes = await request(app.getHttpServer())
        .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
        .send(baseRoleInput)
        .expect(201);
      const roleId = createRes.body.data.id as string;

      const response = await request(app.getHttpServer())
        .put(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${roleId}/permissions`)
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
        .send({ permissions: ["invalid"] });
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe(
        "Permission 'invalid' must be a valid permission string in format 'resource.action' (e.g., 'eventType.read', 'booking.create')"
      );
    });

    it("rejects invalid permission on delete single (400)", async () => {
      const baseRoleInput: CreateTeamRoleInput = {
        name: `neg-delone-invalid-${randomString()}`,
        permissions: ["booking.read"],
      };
      const createRes = await request(app.getHttpServer())
        .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
        .send(baseRoleInput)
        .expect(201);
      const roleId = createRes.body.data.id as string;

      const response = await request(app.getHttpServer())
        .delete(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${roleId}/permissions/${"invalid"}`)
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`);
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe(
        "Permission 'invalid' must be a valid permission string in format 'resource.action' (e.g., 'eventType.read', 'booking.create')"
      );
    });

    it("rejects invalid permission on bulk delete (400)", async () => {
      const baseRoleInput: CreateTeamRoleInput = {
        name: `neg-delmany-invalid-${randomString()}`,
        permissions: ["booking.read", "eventType.create"],
      };
      const createRes = await request(app.getHttpServer())
        .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
        .send(baseRoleInput)
        .expect(201);
      const roleId = createRes.body.data.id as string;

      const invalid = "invalid";
      const res = await request(app.getHttpServer())
        .delete(
          `/v2/organizations/${
            pbacEnabledOrganization.id
          }/roles/${roleId}/permissions?permissions=${encodeURIComponent(`booking.read,${invalid}`)}`
        )
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe(
        "Permission 'invalid' must be a valid permission string in format 'resource.action' (e.g., 'eventType.read', 'booking.create')"
      );
    });

    it("returns 404 when modifying permissions for role not belonging to organization", async () => {
      // Create foreign organization and role
      const foreignOrg = await organizationsRepositoryFixture.create({
        name: `foreign-org-${randomString()}`,
        isOrganization: true,
      });
      const foreignRole = await roleService.createRole({
        name: `foreign-role-${randomString()}`,
        teamId: foreignOrg.id,
        permissions: ["booking.read"],
        type: "CUSTOM",
      });

      const response = await request(app.getHttpServer())
        .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${foreignRole.id}/permissions`)
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
        .send({ permissions: ["eventType.read"] });
      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe(
        `Role with id ${foreignRole.id} within team id ${pbacEnabledOrganization.id} not found`
      );

      await organizationsRepositoryFixture.delete(foreignOrg.id);
    });

    it("returns 404 when modifying permissions of a default (system) role not belonging to organization", async () => {
      const defaultMemberRoleId = await roleService.getDefaultRoleId(MembershipRole.MEMBER);
      const response = await request(app.getHttpServer())
        .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${defaultMemberRoleId}/permissions`)
        .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
        .send({ permissions: ["eventType.read"] });
      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe(
        `Role with id ${defaultMemberRoleId} within team id ${pbacEnabledOrganization.id} not found`
      );
    });
  });

  it("lists permissions for a role (GET /)", async () => {
    const initialPermissions = ["booking.read"] as const;
    const baseRoleInput: CreateTeamRoleInput = {
      name: `perm-target-role-list-${randomString()}`,
      permissions: [...initialPermissions],
    };

    const createRes = await request(app.getHttpServer())
      .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
      .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
      .send(baseRoleInput)
      .expect(201);
    const responseBody: CreateTeamRoleOutput = createRes.body;
    expect(responseBody.status).toEqual(SUCCESS_STATUS);
    expect(responseBody.data.permissions).toEqual(baseRoleInput.permissions);
    const roleId = responseBody.data.id;

    const listRes = await request(app.getHttpServer())
      .get(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${roleId}/permissions`)
      .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
      .expect(200);
    expect(listRes.body.status).toEqual(SUCCESS_STATUS);
    expect(listRes.body.data).toEqual(initialPermissions);
  });

  it("adds permissions (POST /)", async () => {
    const initialPermissions = ["booking.read"] as const;
    const toAdd = ["eventType.create", "eventType.read"] as const;
    const expected = [...initialPermissions, ...toAdd] as string[];

    const baseRoleInput: CreateTeamRoleInput = {
      name: `perm-target-role-add-${randomString()}`,
      permissions: [...initialPermissions],
    };

    const createRes = await request(app.getHttpServer())
      .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
      .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
      .send(baseRoleInput)
      .expect(201);
    const responseBody: CreateTeamRoleOutput = createRes.body;
    expect(responseBody.status).toEqual(SUCCESS_STATUS);
    expect(responseBody.data.permissions).toEqual(baseRoleInput.permissions);
    const roleId = responseBody.data.id;

    const addRes = await request(app.getHttpServer())
      .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${roleId}/permissions`)
      .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
      .send({ permissions: toAdd })
      .expect(200);
    expect(addRes.body.status).toEqual(SUCCESS_STATUS);
    expect(addRes.body.data).toEqual(expected);
  });

  it("bulk removes permissions via query (DELETE /)", async () => {
    const initialPermissions: PermissionString[] = ["booking.read", "eventType.create", "eventType.read"];
    const toRemove: PermissionString[] = ["eventType.create", "eventType.read"];
    const expected: PermissionString[] = ["booking.read"];

    const baseRoleInput: CreateTeamRoleInput = {
      name: `perm-target-role-delmany-${randomString()}`,
      permissions: initialPermissions,
    };
    const createRes = await request(app.getHttpServer())
      .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
      .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
      .send(baseRoleInput)
      .expect(201);
    const responseBody: CreateTeamRoleOutput = createRes.body;
    expect(responseBody.status).toEqual(SUCCESS_STATUS);
    expect(responseBody.data.permissions).toEqual(baseRoleInput.permissions);
    const roleId = responseBody.data.id;

    await request(app.getHttpServer())
      .delete(
        `/v2/organizations/${
          pbacEnabledOrganization.id
        }/roles/${roleId}/permissions?permissions=${toRemove.join(",")}`
      )
      .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
      .expect(204);

    const listRes = await request(app.getHttpServer())
      .get(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${roleId}/permissions`)
      .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
      .expect(200);
    expect(listRes.body.data).toEqual(expected);
  });

  it("replaces all permissions (PUT /)", async () => {
    const initialPermissions = ["booking.read"] as const;
    const replacement = ["booking.read", "eventType.update"] as const;

    const baseRoleInput: CreateTeamRoleInput = {
      name: `perm-target-role-put-${randomString()}`,
      permissions: [...initialPermissions],
    };
    const createRes = await request(app.getHttpServer())
      .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
      .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
      .send(baseRoleInput)
      .expect(201);
    const responseBody: CreateTeamRoleOutput = createRes.body;
    expect(responseBody.status).toEqual(SUCCESS_STATUS);
    expect(responseBody.data.permissions).toEqual(baseRoleInput.permissions);
    const roleId = responseBody.data.id;

    const putRes = await request(app.getHttpServer())
      .put(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${roleId}/permissions`)
      .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
      .send({ permissions: replacement })
      .expect(200);

    expect(putRes.body.status).toEqual(SUCCESS_STATUS);
    expect(putRes.body.data).toEqual(replacement);
  });

  it("removes a single permission (DELETE /:permission)", async () => {
    const initialPermissions = ["booking.read", "eventType.update"] as const;
    const toRemove = "eventType.update" as const;
    const expected = ["booking.read"] as const;

    const baseRoleInput: CreateTeamRoleInput = {
      name: `perm-target-role-delone-${randomString()}`,
      permissions: [...initialPermissions],
    };
    const createRes = await request(app.getHttpServer())
      .post(`/v2/organizations/${pbacEnabledOrganization.id}/roles`)
      .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
      .send(baseRoleInput)
      .expect(201);
    const responseBody: CreateTeamRoleOutput = createRes.body;
    expect(responseBody.status).toEqual(SUCCESS_STATUS);
    expect(responseBody.data.permissions).toEqual(baseRoleInput.permissions);
    const roleId = responseBody.data.id;

    await request(app.getHttpServer())
      .delete(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${roleId}/permissions/${toRemove}`)
      .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
      .expect(204);

    const listRes = await request(app.getHttpServer())
      .get(`/v2/organizations/${pbacEnabledOrganization.id}/roles/${roleId}/permissions`)
      .set("Authorization", `Bearer ${pbacOrgUserWithRolePermissionApiKey}`)
      .expect(200);
    expect(listRes.body.data).toEqual(expected);
  });

  afterAll(async () => {
    try {
      // Clean up feature flag from organization
      await featuresRepositoryFixture.deleteTeamFeature(pbacEnabledOrganization.id, "pbac");

      // Clean up org
      await organizationsRepositoryFixture.delete(pbacEnabledOrganization.id);

      // Clean up user
      await userRepositoryFixture.deleteByEmail(pbacOrgUserWithRolePermission.email);

      // Clean up feature definition
      try {
        await featuresRepositoryFixture.deleteBySlug("pbac");
      } catch (err) {
        console.log(err);
      }
    } catch (err) {
      console.log(err);
    } finally {
      await app.close();
    }
  });
});
