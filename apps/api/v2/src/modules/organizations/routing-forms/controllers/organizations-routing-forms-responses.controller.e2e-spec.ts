import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { App_RoutingForms_Form, App_RoutingForms_FormResponse, Team, User } from "@prisma/client";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

describe("OrganizationsRoutingFormsResponsesController", () => {
  let app: INestApplication;
  let prismaWriteService: PrismaWriteService;
  let org: Team;
  let team: Team;
  let apiKeyString: string;
  let routingForm: App_RoutingForms_Form;
  let routingFormResponse: App_RoutingForms_FormResponse;
  let routingFormResponse2: App_RoutingForms_FormResponse;

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

    // Create an event type for routing form to route to
    const eventType = await prismaWriteService.prisma.eventType.create({
      data: {
        title: "Test Event Type",
        slug: "test-event-type",
        length: 30,
        userId: user.id,
        teamId: team.id,
      },
    });

    routingForm = await prismaWriteService.prisma.app_RoutingForms_Form.create({
      data: {
        name: "Test Routing Form",
        description: "Test Description",
        disabled: false,
        routes: JSON.stringify([
          {
            id: "route-1",
            queryValue: {
              type: "group",
              children1: {
                "question1": {
                  type: "rule",
                  properties: {
                    field: "question1",
                    operator: "equals",
                    value: "answer1"
                  }
                }
              }
            },
            action: {
              type: "eventTypeRedirectUrl",
              eventTypeId: eventType.id,
              value: `team/${team.slug}/${eventType.slug}`
            },
            isFallback: false
          }
        ]),
        fields: JSON.stringify([
          {
            id: "question1",
            type: "text",
            label: "Question 1",
            required: true,
            identifier: "question1"
          },
          {
            id: "question2", 
            type: "text",
            label: "Question 2",
            required: false,
            identifier: "question2"
          }
        ]),
        settings: JSON.stringify({}),
        teamId: team.id,
        userId: user.id,
      },
    });

    routingFormResponse = await prismaWriteService.prisma.app_RoutingForms_FormResponse.create({
      data: {
        formId: routingForm.id,
        response: JSON.stringify({ question1: "answer1", question2: "answer2" }),
      },
    });

    routingFormResponse2 = await prismaWriteService.prisma.app_RoutingForms_FormResponse.create({
      data: {
        formId: routingForm.id,
        response: { question1: "answer1", question2: "answer2" },
      },
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  describe(`GET /v2/organizations/:orgId/routing-forms/:routingFormId/responses`, () => {
    it("should not get routing form responses for non existing org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/99999/routing-forms/${routingForm.id}/responses`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(403);
    });

    it("should not get routing form responses for non existing form", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/routing-forms/non-existent-id/responses`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(404);
    });

    it("should not get routing form responses without authentication", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses`)
        .expect(401);
    });

    it("should get routing form responses", async () => {
      const createdAt = new Date(routingFormResponse.createdAt);
      createdAt.setHours(createdAt.getHours() - 1);
      const isoStringCreatedAt = createdAt.toISOString();
      return request(app.getHttpServer())
        .get(
          `/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses?skip=0&take=2&sortUpdatedAt=asc&sortCreatedAt=desc&afterCreatedAt=${isoStringCreatedAt}`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const responses = responseBody.data as App_RoutingForms_FormResponse[];
          expect(responses).toBeDefined();
          expect(responses.length).toBeGreaterThan(0);
          expect(responses.find((response) => response.id === routingFormResponse.id)).toBeDefined();
          expect(responses.find((response) => response.id === routingFormResponse.id)?.formId).toEqual(
            routingFormResponse.formId
          );
          expect(responses.find((response) => response.id === routingFormResponse2.id)).toBeDefined();
          expect(responses.find((response) => response.id === routingFormResponse2.id)?.formId).toEqual(
            routingFormResponse2.formId
          );
        });
    });
  });

  describe(`POST /v2/organizations/:orgId/routing-forms/:routingFormId/responses`, () => {
    it("should not create routing form response for non existing org", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/99999/routing-forms/${routingForm.id}/responses`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          question1: "answer1",
          start: "2050-09-05",
          end: "2050-09-06",
        })
        .expect(403);
    });

    it("should not create routing form response for non existing form", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/routing-forms/non-existent-id/responses`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          question1: "answer1",
          start: "2050-09-05",
          end: "2050-09-06",
        })
        .expect(404);
    });

    it("should not create routing form response without authentication", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses`)
        .send({
          question1: "answer1",
          start: "2050-09-05",
          end: "2050-09-06",
        })
        .expect(401);
    });

    it("should create routing form response and return available slots", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          question1: "answer1", // This matches the route condition
          question2: "answer2",
          start: "2050-09-05",
          end: "2050-09-06",
        })
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data;
          expect(data).toBeDefined();
          expect(data.responseId).toBeDefined();
          expect(typeof data.responseId).toBe("number");
          expect(data.eventTypeId).toBeDefined();
          expect(typeof data.eventTypeId).toBe("number");
          expect(data.slots).toBeDefined();
          expect(typeof data.slots).toBe("object");
        });
    });

    it("should handle missing required fields validation", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          question2: "answer2", // Missing required question1
          start: "2050-09-05",
          end: "2050-09-06",
        })
        .expect(400);
    });

    it("should handle no matching route scenario", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          question1: "different-answer", // This won't match any route
          question2: "answer2",
          start: "2050-09-05",
          end: "2050-09-06",
        })
        .expect(404)
        .then((response) => {
          expect(response.body.message).toContain("No matching route found");
        });
    });

    it("should validate required slot parameters", async () => {
      // Missing start parameter
      await request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          question1: "answer1",
          question2: "answer2",
          end: "2050-09-06",
        })
        .expect(400);

      // Missing end parameter  
      await request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          question1: "answer1",
          question2: "answer2",
          start: "2050-09-05",
        })
        .expect(400);
    });

    it("should support optional slot parameters", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          question1: "answer1",
          question2: "answer2",
          start: "2050-09-05",
          end: "2050-09-06",
          timeZone: "America/New_York",
          duration: 60,
          format: "range",
        })
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data;
          expect(data).toBeDefined();
          expect(data.responseId).toBeDefined();
          expect(typeof data.responseId).toBe("number");
          expect(data.eventTypeId).toBeDefined();
          expect(data.slots).toBeDefined();
        });
    });
  });

  describe(`PATCH /v2/organizations/:orgId/routing-forms/:routingFormId/responses/:responseId`, () => {
    it("should not update routing form response for non existing org", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/99999/routing-forms/${routingForm.id}/responses/${routingFormResponse.id}`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(403);
    });

    it("should not update routing form response for non existing form", async () => {
      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/${org.id}/routing-forms/non-existent-id/responses/${routingFormResponse.id}`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(404);
    });

    it("should not update routing form response for non existing response", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses/99999`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(404);
    });

    it("should not update routing form response without authentication", async () => {
      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses/${routingFormResponse.id}`
        )
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(401);
    });

    it("should update routing form response", async () => {
      const updatedResponse = { question1: "updated_answer1", question2: "updated_answer2" };
      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses/${routingFormResponse.id}`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ response: updatedResponse })
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data;
          expect(data).toBeDefined();
          expect(data.id).toEqual(routingFormResponse.id);
          expect(data.formId).toEqual(routingFormResponse.formId);
          expect(data.response).toEqual(updatedResponse);
        });
    });
  });

  afterAll(async () => {
    await prismaWriteService.prisma.app_RoutingForms_FormResponse.delete({
      where: {
        id: routingFormResponse.id,
      },
    });
    await prismaWriteService.prisma.app_RoutingForms_FormResponse.delete({
      where: {
        id: routingFormResponse2.id,
      },
    });
    await prismaWriteService.prisma.app_RoutingForms_Form.deleteMany({
      where: {
        teamId: org.id,
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
    await prismaWriteService.prisma.user.delete({
      where: {
        id: user.id,
      },
    });

    await app.close();
  });
});
