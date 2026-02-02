import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { App_RoutingForms_Form, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { GetRoutingFormsOutput } from "@/modules/organizations/routing-forms/outputs/get-routing-forms.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("OrganizationsRoutingFormsResponsesController", () => {
  let app: INestApplication;
  let prismaWriteService: PrismaWriteService;
  let org: Team;
  let team: Team;
  let apiKeyString: string;
  let routingForm: App_RoutingForms_Form;

  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;

  let user: User;
  const userEmail = `OrganizationsRoutingFormsResponsesController-key-bookings-2024-08-13-user-${randomString()}@api.com`;
  let profileRepositoryFixture: ProfileRepositoryFixture;

  let membershipsRepositoryFixture: MembershipRepositoryFixture;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, TokensModule],
    }).compile();

    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);

    prismaWriteService = moduleRef.get<PrismaWriteService>(PrismaWriteService);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
    profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);

    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    org = await organizationsRepositoryFixture.create({
      name: `OrganizationsRoutingFormsResponsesController-teams-memberships-organization-${randomString()}`,
      isOrganization: true,
    });

    team = await teamRepositoryFixture.create({
      name: "OrganizationsRoutingFormsResponsesController orgs booking 1",
      isOrganization: false,
      parent: { connect: { id: org.id } },
    });

    user = await userRepositoryFixture.create({
      email: userEmail,
    });

    await membershipsRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: user.id } },
      team: { connect: { id: org.id } },
    });

    await profileRepositoryFixture.create({
      uid: `usr-${user.id}`,
      username: userEmail,
      organization: {
        connect: {
          id: org.id,
        },
      },
      user: {
        connect: {
          id: user.id,
        },
      },
    });
    const now = new Date();
    now.setDate(now.getDate() + 1);
    const { keyString } = await apiKeysRepositoryFixture.createApiKey(user.id, null);
    apiKeyString = `${keyString}`;

    routingForm = await prismaWriteService.prisma.app_RoutingForms_Form.create({
      data: {
        name: "Test Routing Form",
        description: "Test Description",
        disabled: false,
        routes: JSON.stringify([]),
        fields: JSON.stringify([]),
        settings: JSON.stringify({}),
        teamId: team.id,
        userId: user.id,
      },
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });
  afterAll(async () => {
    await prismaWriteService.prisma.app_RoutingForms_Form.deleteMany({
      where: {
        teamId: team.id,
      },
    });
    await prismaWriteService.prisma.apiKey.deleteMany({
      where: {
        teamId: org.id,
      },
    });
    await prismaWriteService.prisma.team.delete({
      where: {
        id: team.id,
      },
    });
    await prismaWriteService.prisma.team.delete({
      where: {
        id: org.id,
      },
    });
    await app.close();
  });

  describe(`GET /v2/organizations/:orgId/teams/:teamId/routing-forms`, () => {
    it("should not get team routing forms for non existing org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/99999/teams/${team.id}/routing-forms`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(403);
    });

    it("should not get team routing forms for non existing team", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/99999/routing-forms`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(404);
    });

    it("should not get team routing forms without authentication", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${team.id}/routing-forms`)
        .expect(401);
    });

    it("should get team routing forms", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${team.id}/routing-forms`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          const responseBody: GetRoutingFormsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const routingForms = responseBody.data;
          expect(routingForms).toBeDefined();
          expect(routingForms.length).toBeGreaterThan(0);
          expect(routingForms[0].id).toEqual(routingForm.id);
          expect(routingForms[0].name).toEqual(routingForm.name);
          expect(routingForms[0].description).toEqual(routingForm.description);
          expect(routingForms[0].disabled).toEqual(routingForm.disabled);
        });
    });

    it("should filter team routing forms by name", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${team.id}/routing-forms?name=Team`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          const responseBody: GetRoutingFormsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const routingForms = responseBody.data;
          expect(routingForms).toBeDefined();
          expect(routingForms.length).toBeGreaterThan(0);
          expect(routingForms[0].name).toContain("Test Routing Form");
        });
    });

    it("should filter team routing forms by disabled status", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${team.id}/routing-forms?disabled=false`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          const responseBody: GetRoutingFormsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const routingForms = responseBody.data;
          expect(routingForms).toBeDefined();
          expect(routingForms.length).toBeGreaterThan(0);
          expect(routingForms[0].disabled).toEqual(false);
        });
    });
  });
});
