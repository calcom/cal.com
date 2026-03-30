import { RoleService } from "@calcom/platform-libraries/pbac";
import type { Attribute, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { AttributeRepositoryFixture } from "test/fixtures/repository/attributes.repository.fixture";
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

describe("Organizations PBAC Guard Integration", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let membershipRepositoryFixture: MembershipRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let featuresRepositoryFixture: FeaturesRepositoryFixture;
  let attributeRepositoryFixture: AttributeRepositoryFixture;
  let roleService: RoleService;

  let noPbacAdminUser: User;
  let pbacMemberWithPerms: User;
  let pbacMemberWithoutPerms: User;

  let noPbacAdminApiKey: string;
  let pbacMemberWithPermsApiKey: string;
  let pbacMemberWithoutPermsApiKey: string;

  let noPbacOrg: Team;
  let pbacOrg: Team;
  let noPbacTeam: Team;
  let pbacTeam: Team;

  let pbacOrgAttribute: Attribute;

  let spyCheckPerms: jest.SpyInstance;
  let spyCheckRoleAccess: jest.SpyInstance;

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
    attributeRepositoryFixture = new AttributeRepositoryFixture(moduleRef);
    roleService = new RoleService();

    noPbacAdminUser = await userRepositoryFixture.create({
      email: `pbac-guard-no-pbac-admin-${randomString()}@api.com`,
      username: `pbac-guard-no-pbac-admin-${randomString()}`,
    });

    pbacMemberWithPerms = await userRepositoryFixture.create({
      email: `pbac-guard-with-perms-${randomString()}@api.com`,
      username: `pbac-guard-with-perms-${randomString()}`,
    });

    pbacMemberWithoutPerms = await userRepositoryFixture.create({
      email: `pbac-guard-without-perms-${randomString()}@api.com`,
      username: `pbac-guard-without-perms-${randomString()}`,
    });

    noPbacOrg = await organizationsRepositoryFixture.create({
      name: `pbac-guard-no-pbac-org-${randomString()}`,
      isOrganization: true,
    });

    pbacOrg = await organizationsRepositoryFixture.create({
      name: `pbac-guard-pbac-org-${randomString()}`,
      isOrganization: true,
    });

    await featuresRepositoryFixture.create({ slug: "pbac", enabled: true });
    await featuresRepositoryFixture.setTeamFeatureState({
      teamId: pbacOrg.id,
      featureId: "pbac",
      state: "enabled",
    });

    noPbacTeam = await teamRepositoryFixture.create({
      name: `pbac-guard-no-pbac-team-${randomString()}`,
      parent: { connect: { id: noPbacOrg.id } },
    });

    pbacTeam = await teamRepositoryFixture.create({
      name: `pbac-guard-pbac-team-${randomString()}`,
      parent: { connect: { id: pbacOrg.id } },
    });

    await membershipRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: noPbacAdminUser.id } },
      team: { connect: { id: noPbacOrg.id } },
    });
    await membershipRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: noPbacAdminUser.id } },
      team: { connect: { id: noPbacTeam.id } },
    });

    const withPermsOrgMembership = await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: pbacMemberWithPerms.id } },
      team: { connect: { id: pbacOrg.id } },
    });
    await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: pbacMemberWithPerms.id } },
      team: { connect: { id: pbacTeam.id } },
    });

    const withoutPermsOrgMembership = await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: pbacMemberWithoutPerms.id } },
      team: { connect: { id: pbacOrg.id } },
    });
    await membershipRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: pbacMemberWithoutPerms.id } },
      team: { connect: { id: pbacTeam.id } },
    });

    const roleWithAllPermissions = await roleService.createRole({
      name: `PBAC Guard Test Full Perms ${randomString()}`,
      teamId: pbacOrg.id,
      permissions: [
        "organization.listMembers",
        "booking.readOrgBookings",
        "organization.read",
        "organization.update",
        "organization.delete",
        "organization.editUsers",
        "organization.manageBilling",
        "organization.attributes.read",
        "webhook.read",
        "routingForm.read",
        "team.read",
        "team.update",
        "team.listMembers",
        "booking.readTeamBookings",
        "team.invite",
        "workflow.read",
        "eventType.read",
        "eventType.update",
        "availability.read",
        "availability.create",
        "availability.update",
        "availability.delete",
        "ooo.read",
        "ooo.create",
        "ooo.update",
        "ooo.delete",
      ],
      type: "CUSTOM",
    });

    const roleWithNoMatchingPermissions = await roleService.createRole({
      name: `PBAC Guard Test No Perms ${randomString()}`,
      teamId: pbacOrg.id,
      permissions: ["role.read"],
      type: "CUSTOM",
    });

    await roleService.assignRoleToMember(roleWithAllPermissions.id, withPermsOrgMembership.id);
    await roleService.assignRoleToMember(roleWithNoMatchingPermissions.id, withoutPermsOrgMembership.id);

    const { keyString: noPbacAdminKeyString } = await apiKeysRepositoryFixture.createApiKey(
      noPbacAdminUser.id,
      null
    );
    noPbacAdminApiKey = `cal_test_${noPbacAdminKeyString}`;

    const { keyString: withPermsKeyString } = await apiKeysRepositoryFixture.createApiKey(
      pbacMemberWithPerms.id,
      null
    );
    pbacMemberWithPermsApiKey = `cal_test_${withPermsKeyString}`;

    const { keyString: withoutPermsKeyString } = await apiKeysRepositoryFixture.createApiKey(
      pbacMemberWithoutPerms.id,
      null
    );
    pbacMemberWithoutPermsApiKey = `cal_test_${withoutPermsKeyString}`;

    pbacOrgAttribute = await attributeRepositoryFixture.create({
      name: `pbac-guard-test-attr-${randomString()}`,
      slug: `pbac-guard-test-attr-${randomString()}`,
      type: "TEXT",
      team: { connect: { id: pbacOrg.id } },
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  beforeEach(() => {
    spyCheckPerms = jest.spyOn(
      PbacGuard.prototype as unknown as PbacGuard,
      "checkUserHasRequiredPermissions"
    );
    spyCheckRoleAccess = jest.spyOn(
      RolesGuard.prototype as unknown as RolesGuard,
      "checkUserRoleAccess"
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function assertGuardSpies(opts: {
    pbacCheckCalled: boolean;
    pbacResult?: boolean;
    roleCheckCalled: boolean;
    roleResult?: boolean;
  }) {
    if (opts.pbacCheckCalled) {
      expect(spyCheckPerms).toHaveBeenCalled();
      const hasPerms = await spyCheckPerms.mock.results[0].value;
      expect(hasPerms).toBe(opts.pbacResult);
    } else {
      expect(spyCheckPerms).not.toHaveBeenCalled();
    }
    if (opts.roleCheckCalled) {
      expect(spyCheckRoleAccess).toHaveBeenCalled();
      if (opts.roleResult !== undefined) {
        const { canAccess } = await spyCheckRoleAccess.mock.results[0].value;
        expect(canAccess).toBe(opts.roleResult);
      }
    } else {
      expect(spyCheckRoleAccess).not.toHaveBeenCalled();
    }
  }

  async function expectRolesAllowedWithoutPbacEnabled(makeRequest: () => request.Test) {
    await makeRequest();
    await assertGuardSpies({ pbacCheckCalled: false, roleCheckCalled: true, roleResult: true });
  }

  async function expectPbacAllowed(makeRequest: () => request.Test) {
    await makeRequest();
    await assertGuardSpies({ pbacCheckCalled: true, pbacResult: true, roleCheckCalled: false });
  }

  async function expectPbacAndRolesDenied(makeRequest: () => request.Test) {
    const response = await makeRequest();
    expect(response.status).toBe(403);
    await assertGuardSpies({ pbacCheckCalled: true, pbacResult: false, roleCheckCalled: true, roleResult: false });
  }

  async function expectPbacDeniedButRolesAllowed(makeRequest: () => request.Test) {
    await makeRequest();
    await assertGuardSpies({ pbacCheckCalled: true, pbacResult: false, roleCheckCalled: true, roleResult: true });
  }

  describe("Org endpoints", () => {
    describe("GET /organizations/:orgId/memberships", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/memberships`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/memberships`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/memberships`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/bookings", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/bookings`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/bookings`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/bookings`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/organizations", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/organizations`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/organizations`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/organizations`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/attributes", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/attributes`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/attributes`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission falls back to role check (@Roles ORG_MEMBER allows MEMBER)", async () => {
        await expectPbacDeniedButRolesAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/attributes`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/attributes/:attributeId/options", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path, attribute belongs to different org so may return empty)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/attributes/${pbacOrgAttribute.id}/options`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/attributes/${pbacOrgAttribute.id}/options`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission falls back to role check (@Roles ORG_MEMBER allows MEMBER)", async () => {
        await expectPbacDeniedButRolesAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/attributes/${pbacOrgAttribute.id}/options`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/users", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/users`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/users`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/users`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("PATCH /organizations/:orgId/users/:userId", () => {
      it("no-PBAC admin passes PbacGuard and RolesGuard (no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .patch(`/v2/organizations/${noPbacOrg.id}/users/${noPbacAdminUser.id}`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
            .send({})
        );
      });

      it("PBAC member with permission passes PbacGuard (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .patch(`/v2/organizations/${pbacOrg.id}/users/${pbacMemberWithPerms.id}`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
            .send({})
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .patch(`/v2/organizations/${pbacOrg.id}/users/${pbacMemberWithPerms.id}`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
            .send({})
        );
      });
    });

    describe("DELETE /organizations/:orgId/organizations/:managedOrganizationId", () => {
      it("no-PBAC admin passes PbacGuard and RolesGuard (no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .delete(`/v2/organizations/${noPbacOrg.id}/organizations/999999`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission passes PbacGuard (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .delete(`/v2/organizations/${pbacOrg.id}/organizations/999999`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .delete(`/v2/organizations/${pbacOrg.id}/organizations/999999`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/webhooks", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/webhooks`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/webhooks`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/webhooks`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/routing-forms", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/routing-forms`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/routing-forms`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/routing-forms`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/schedules", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/schedules`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/schedules`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/schedules`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/users/:userId/bookings", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/users/${noPbacAdminUser.id}/bookings`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/users/${pbacMemberWithPerms.id}/bookings`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/users/${pbacMemberWithoutPerms.id}/bookings`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/users/:userId/ooo", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/users/${noPbacAdminUser.id}/ooo`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/users/${pbacMemberWithPerms.id}/ooo`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/users/${pbacMemberWithoutPerms.id}/ooo`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/ooo", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/ooo`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/ooo`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/ooo`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("POST /organizations/:orgId/delegation-credentials", () => {
      it("no-PBAC admin passes PbacGuard and RolesGuard (no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .post(`/v2/organizations/${noPbacOrg.id}/delegation-credentials`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
            .send({})
        );
      });

      it("PBAC member with permission passes PbacGuard (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .post(`/v2/organizations/${pbacOrg.id}/delegation-credentials`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
            .send({})
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .post(`/v2/organizations/${pbacOrg.id}/delegation-credentials`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
            .send({})
        );
      });
    });
  });

  describe("Org team endpoints", () => {
    describe("GET /organizations/:orgId/teams", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/teams`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/teams/me", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/teams/me`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/me`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission falls back to role check (@Roles ORG_MEMBER allows MEMBER)", async () => {
        await expectPbacDeniedButRolesAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/me`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/teams/:teamId", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/teams/${noPbacTeam.id}`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      // Default member_role (auto-assigned by DB trigger) has team.read
      it("PBAC member without custom permission is authorized via default member_role on team membership", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/teams/:teamId/memberships", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/teams/${noPbacTeam.id}/memberships`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/memberships`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      // Default member_role (auto-assigned by DB trigger) has team.listMembers (added in migration 20250829)
      it("PBAC member without custom permission is authorized via default member_role on team membership", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/memberships`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/teams/:teamId/bookings", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/teams/${noPbacTeam.id}/bookings`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/bookings`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/bookings`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/teams/:teamId/routing-forms", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/teams/${noPbacTeam.id}/routing-forms`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/routing-forms`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      // Default member_role (auto-assigned by DB trigger) has routingForm.read
      it("PBAC member without custom permission is authorized via default member_role on team membership", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/routing-forms`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/teams/:teamId/workflows", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/teams/${noPbacTeam.id}/workflows`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/workflows`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      // Default member_role (auto-assigned by DB trigger) has workflow.read
      it("PBAC member without custom permission is authorized via default member_role on team membership", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/workflows`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/teams/:teamId/conferencing", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/teams/${noPbacTeam.id}/conferencing`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/conferencing`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      // Default member_role (auto-assigned by DB trigger) has team.read
      it("PBAC member without custom permission is authorized via default member_role on team membership", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/conferencing`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/teams/:teamId/stripe/check", () => {
      it("no-PBAC admin passes PbacGuard and RolesGuard (no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/teams/${noPbacTeam.id}/stripe/check`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission passes PbacGuard (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/stripe/check`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/stripe/check`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/teams/:teamId/schedules", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/teams/${noPbacTeam.id}/schedules`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/schedules`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      // Default member_role (auto-assigned by DB trigger) has availability.read
      it("PBAC member without custom permission is authorized via default member_role on team membership", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/schedules`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });

    describe("GET /organizations/:orgId/teams/:teamId/verified-resources/emails", () => {
      it("no-PBAC admin can access (RolesGuard no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${noPbacOrg.id}/teams/${noPbacTeam.id}/verified-resources/emails`)
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
        );
      });

      it("PBAC member with permission can access (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/verified-resources/emails`)
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
        );
      });

      // Default member_role (auto-assigned by DB trigger) has team.read
      it("PBAC member without custom permission is authorized via default member_role on team membership", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .get(`/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/verified-resources/emails`)
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
        );
      });
    });
  });

  describe("Method endpoints", () => {
    describe("POST /organizations/:orgId/teams/:teamId/event-types/:eventTypeId/create-phone-call", () => {
      it("no-PBAC admin passes PbacGuard and RolesGuard (no-PBAC path)", async () => {
        await expectRolesAllowedWithoutPbacEnabled(() =>
          request(app.getHttpServer())
            .post(
              `/v2/organizations/${noPbacOrg.id}/teams/${noPbacTeam.id}/event-types/999999/create-phone-call`
            )
            .set("Authorization", `Bearer ${noPbacAdminApiKey}`)
            .send({})
        );
      });

      it("PBAC member with permission passes PbacGuard (PbacGuard authorizes)", async () => {
        await expectPbacAllowed(() =>
          request(app.getHttpServer())
            .post(
              `/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/event-types/999999/create-phone-call`
            )
            .set("Authorization", `Bearer ${pbacMemberWithPermsApiKey}`)
            .send({})
        );
      });

      it("PBAC member without permission is denied (PbacGuard rejects, RolesGuard denies MEMBER)", async () => {
        await expectPbacAndRolesDenied(() =>
          request(app.getHttpServer())
            .post(
              `/v2/organizations/${pbacOrg.id}/teams/${pbacTeam.id}/event-types/999999/create-phone-call`
            )
            .set("Authorization", `Bearer ${pbacMemberWithoutPermsApiKey}`)
            .send({})
        );
      });
    });
  });

  afterAll(async () => {
    try {
      await featuresRepositoryFixture.deleteTeamFeature(pbacOrg.id, "pbac");
      await attributeRepositoryFixture.delete(pbacOrgAttribute.id);
      await teamRepositoryFixture.delete(noPbacTeam.id);
      await teamRepositoryFixture.delete(pbacTeam.id);
      await organizationsRepositoryFixture.delete(noPbacOrg.id);
      await organizationsRepositoryFixture.delete(pbacOrg.id);
      await userRepositoryFixture.deleteByEmail(noPbacAdminUser.email);
      await userRepositoryFixture.deleteByEmail(pbacMemberWithPerms.email);
      await userRepositoryFixture.deleteByEmail(pbacMemberWithoutPerms.email);

    } catch (error) {
      console.error("Cleanup error:", error);
    } finally {
      await app.close();
    }
  });
});
