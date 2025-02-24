import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { GetRoutingFormResponsesOutput } from "@/modules/organizations/teams/routing-forms/outputs/get-routing-form-responses.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { RoutingFormsRepositoryFixture } from "test/fixtures/repository/routing-forms.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { Team } from "@calcom/prisma/client";

describe("Organizations Teams Routing Forms Responses", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;

  let teamsRepositoryFixture: TeamRepositoryFixture;
  let profileRepositoryFixture: ProfileRepositoryFixture;
  let routingFormsRepositoryFixture: RoutingFormsRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;

  let org: Team;
  let orgTeam: Team;

  const authEmail = `organizations-teams-routing-forms-responses-user-${randomString()}@api.com`;
  let user: User;
  let apiKeyString: string;

  let routingFormId: string;
  const routingFormResponses = [
    {
      id: 1,
      formFillerId: "cm78tvkvd0001kh8jq0tu5iq9",
      response: {
        "participant-field": {
          label: "participant",
          value: "mamut",
        },
      },
      createdAt: new Date("2025-02-17T09:03:18.121Z"),
    },
  ];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, TokensModule],
    }).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
    teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    routingFormsRepositoryFixture = new RoutingFormsRepositoryFixture(moduleRef);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

    org = await organizationsRepositoryFixture.create({
      name: `organizations-teams-routing-forms-responses-organization-${randomString()}`,
      isOrganization: true,
    });

    user = await userRepositoryFixture.create({
      email: authEmail,
      username: authEmail,
    });

    const { keyString } = await apiKeysRepositoryFixture.createApiKey(user.id, null);
    apiKeyString = keyString;

    orgTeam = await teamsRepositoryFixture.create({
      name: `organizations-teams-routing-forms-responses-team-${randomString()}`,
      isOrganization: false,
      parent: { connect: { id: org.id } },
    });

    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: user.id } },
      team: { connect: { id: org.id } },
    });

    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: user.id } },
      team: { connect: { id: orgTeam.id } },
    });

    await profileRepositoryFixture.create({
      uid: `usr-${user.id}`,
      username: authEmail,
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

    const routingForm = await routingFormsRepositoryFixture.create({
      name: "Test Routing Form",
      description: null,
      position: 0,
      disabled: false,
      fields: JSON.stringify([
        {
          type: "text",
          label: "participant",
          required: true,
        },
      ]),
      routes: JSON.stringify([
        {
          action: { type: "customPageMessage", value: "Thank you for your response" },
        },
      ]),
      user: {
        connect: {
          id: user.id,
        },
      },
      team: {
        connect: {
          id: orgTeam.id,
        },
      },
      responses: {
        create: routingFormResponses,
      },
    });
    routingFormId = routingForm.id;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  it("should not get routing form responses for non existing org", async () => {
    return request(app.getHttpServer())
      .get(`/v2/organizations/99999/teams/${orgTeam.id}/routing-forms/${routingFormId}/responses`)
      .expect(401);
  });

  it("should not get routing form responses for non existing team", async () => {
    return request(app.getHttpServer())
      .get(`/v2/organizations/${org.id}/teams/99999/routing-forms/${routingFormId}/responses`)
      .expect(401);
  });

  it("should not get routing form responses for non existing routing form", async () => {
    return request(app.getHttpServer())
      .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/99999/responses`)
      .expect(401);
  });

  it("should get routing form responses", async () => {
    return request(app.getHttpServer())
      .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/${routingFormId}/responses`)
      .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
      .expect(200)
      .then((response) => {
        const responseBody: GetRoutingFormResponsesOutput = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const responseData = responseBody.data;
        expect(responseData).toBeDefined();
        expect(responseData.length).toEqual(1);
        expect(responseData[0].id).toEqual(routingFormResponses[0].id);
        expect(responseData[0].response).toEqual(routingFormResponses[0].response);
        expect(responseData[0].formFillerId).toEqual(routingFormResponses[0].formFillerId);
        expect(responseData[0].createdAt).toEqual(routingFormResponses[0].createdAt.toISOString());
      });
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(user.email);
    await organizationsRepositoryFixture.delete(org.id);
    await app.close();
  });
});
