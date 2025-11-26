import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { GetRoutingFormResponsesOutput } from "@/modules/organizations/teams/routing-forms/outputs/get-routing-form-responses.output";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
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
import type { User, Team } from "@calcom/prisma/client";

describe("Organizations Teams Routing Forms Responses", () => {
  let app: INestApplication;
  let prismaWriteService: PrismaWriteService;

  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;

  let teamsRepositoryFixture: TeamRepositoryFixture;
  let profileRepositoryFixture: ProfileRepositoryFixture;
  let routingFormsRepositoryFixture: RoutingFormsRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;

  let org: Team;
  let orgTeam: Team;
  let routingFormResponseId: number;
  const authEmail = `organizations-teams-routing-forms-responses-user-${randomString()}@api.com`;
  let user: User;
  let apiKeyString: string;

  let routingFormId: string;
  let routingEventType: {
    id: number;
    slug: string | null;
    teamId: number | null;
    userId: number | null;
    title: string;
  };
  const routingFormResponses = [
    {
      formFillerId: `${randomString()}`,
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

    prismaWriteService = moduleRef.get<PrismaWriteService>(PrismaWriteService);
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

    // Create an event type for routing form to route to
    routingEventType = await prismaWriteService.prisma.eventType.create({
      data: {
        title: "Test Event Type",
        slug: "test-event-type",
        length: 30,
        userId: user.id,
        teamId: orgTeam.id,
      },
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
      fields: [
        {
          id: "participant-field",
          type: "text",
          label: "participant",
          required: true,
          identifier: "participant",
        },
        {
          id: "question2-field",
          type: "text",
          label: "question2",
          required: false,
          identifier: "question2",
        },
      ],
      routes: [
        {
          id: "route-1",
          queryValue: {
            id: "route-1",
            type: "group",
            children1: {
              "rule-1": {
                type: "rule",
                properties: {
                  field: "question1",
                  operator: "equal",
                  value: ["answer1"],
                  valueSrc: ["value"],
                  valueType: ["text"],
                },
              },
            },
          },
          action: {
            type: "eventTypeRedirectUrl",
            eventTypeId: routingEventType.id,
            value: `team/${orgTeam.slug}/${routingEventType.slug}`,
          },
          isFallback: false,
        },
        {
          id: "fallback-route",
          queryValue: {
            id: "fallback-route",
            type: "group",
            children1: {},
          },
          action: { type: "customPageMessage", value: "Thank you for your response" },
          isFallback: true,
        },
      ],
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
      .get(
        `/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/${routingFormId}/responses?skip=0&take=1`
      )
      .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
      .expect(200)
      .then((response) => {
        const responseBody: GetRoutingFormResponsesOutput = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const responseData = responseBody.data;
        expect(responseData).toBeDefined();
        expect(responseData.length).toEqual(1);
        expect(responseData[0].response).toEqual(routingFormResponses[0].response);
        expect(responseData[0].formFillerId).toEqual(routingFormResponses[0].formFillerId);
        expect(responseData[0].createdAt).toEqual(routingFormResponses[0].createdAt.toISOString());
        routingFormResponseId = responseData[0].id;
      });
  });

  describe(`POST /v2/organizations/:orgId/teams/:teamId/routing-forms/:routingFormId/responses`, () => {
    describe("permissions", () => {
      it("should return 403 when organization does not exist", async () => {
        return request(app.getHttpServer())
          .post(
            `/v2/organizations/99999/teams/${orgTeam.id}/routing-forms/${routingFormId}/responses?start=2050-09-05&end=2050-09-06`
          )
          .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
          .send({
            question1: "answer1",
          })
          .expect(403);
      });

      it("should return 404 when team does not exist", async () => {
        return request(app.getHttpServer())
          .post(
            `/v2/organizations/${org.id}/teams/99999/routing-forms/${routingFormId}/responses?start=2050-09-05&end=2050-09-06`
          )
          .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
          .send({
            question1: "answer1",
          })
          .expect(404)
          .then((response) => {
            expect(response.body.error.message).toContain(`IsTeamInOrg - Team (99999) not found.`);
          });
      });

      it("should return 403 when routing form does not exist in the team", async () => {
        return request(app.getHttpServer())
          .post(
            `/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/non-existent-id/responses?start=2050-09-05&end=2050-09-06`
          )
          .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
          .send({
            question1: "answer1",
          })
          .expect(403)
          .then((response) => {
            expect(response.body.error.message).toContain(
              `IsRoutingFormInTeam - team with id=(${orgTeam.id}) does not own routing form with id=(non-existent-id).`
            );
          });
      });

      it("should return 403 when routing form belongs to different team", async () => {
        // Create a second team within the same organization
        const otherTeam = await teamsRepositoryFixture.create({
          name: `other-team-${randomString()}`,
          isOrganization: false,
          parent: { connect: { id: org.id } },
        });

        // Create a routing form that belongs to the other team
        const otherTeamRoutingForm = await routingFormsRepositoryFixture.create({
          name: "Other Team's Routing Form",
          description: "Test Description",
          position: 0,
          disabled: false,
          fields: [
            {
              type: "text",
              label: "Question 1",
              required: true,
            },
          ],
          routes: [
            {
              action: { type: "customPageMessage", value: "Thank you for your response" },
            },
          ],
          user: {
            connect: {
              id: user.id,
            },
          },
          team: {
            connect: {
              id: otherTeam.id,
            },
          },
        });

        // Try to access the routing form that belongs to the other team
        const response = await request(app.getHttpServer())
          .post(
            `/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/${otherTeamRoutingForm.id}/responses?start=2050-09-05&end=2050-09-06`
          )
          .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
          .send({
            question1: "answer1",
          });

        expect(response.status).toBe(403);
        expect(response.body.error.message).toContain(
          `IsRoutingFormInTeam - team with id=(${orgTeam.id}) does not own routing form with id=(${otherTeamRoutingForm.id}).`
        );

        // Clean up
        await routingFormsRepositoryFixture.delete(otherTeamRoutingForm.id);
        await teamsRepositoryFixture.delete(otherTeam.id);
      });

      it("should return 401 when authentication token is missing", async () => {
        return request(app.getHttpServer())
          .post(
            `/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/${routingFormId}/responses?start=2050-09-05&end=2050-09-06`
          )
          .send({
            question1: "answer1",
          })
          .expect(401);
      });
    });

    it("should return 400 when required form fields are missing", async () => {
      return request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/${routingFormId}/responses?start=2050-09-05&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          // Missing required participant field
        })
        .expect(400);
    });

    it("should return 400 when required slot query parameters are missing", async () => {
      // Missing start parameter
      await request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/${routingFormId}/responses?end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          participant: "test-participant",
        })
        .expect(400);

      // Missing end parameter
      await request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/${routingFormId}/responses?start=2050-09-05`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          participant: "test-participant",
        })
        .expect(400);
    });

    it("should return 400 when date parameters have invalid format", async () => {
      return request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/${routingFormId}/responses?start=invalid-date&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          participant: "test-participant",
        })
        .expect(400);
    });

    it("should return 400 when end date is before start date", async () => {
      return request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/${routingFormId}/responses?start=2050-09-10&end=2050-09-05`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          participant: "test-participant",
        })
        .expect(400);
    });

    it("should handle queued response creation", async () => {
      return request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/${routingFormId}/responses?start=2050-09-05&end=2050-09-06&queueResponse=true`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          participant: "test-participant",
        })
        .expect(201)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data;
          console.log("responseBody", responseBody.data);
          expect(data.routing?.queuedResponseId).toBeDefined();
        });
    });

    it("should create response and return available slots when routing to event type", async () => {
      // Create a routing form with event type routing
      const eventTypeRoutingForm = await prismaWriteService.prisma.app_RoutingForms_Form.create({
        data: {
          name: "Test Event Type Routing Form",
          description: "Test Description",
          disabled: false,
          routes: [
            {
              id: "route-1",
              queryValue: {
                id: "route-1",
                type: "group",
                children1: {
                  "rule-1": {
                    type: "rule",
                    properties: {
                      field: "question1",
                      operator: "equal",
                      value: ["answer1"],
                      valueSrc: ["value"],
                      valueType: ["text"],
                    },
                  },
                },
              },
              action: {
                type: "eventTypeRedirectUrl",
                eventTypeId: routingEventType.id,
                value: `team/${orgTeam.slug}/${routingEventType.slug}`,
              },
              isFallback: false,
            },
            {
              id: "fallback-route",
              action: { type: "customPageMessage", value: "Fallback Message" },
              isFallback: true,
              queryValue: { id: "fallback-route", type: "group" },
            },
          ],
          fields: [
            {
              id: "question1",
              type: "text",
              label: "Question 1",
              required: true,
              identifier: "question1",
            },
            {
              id: "question2",
              type: "text",
              label: "Question 2",
              required: false,
              identifier: "question2",
            },
          ],
          settings: {
            emailOwnerOnSubmission: false,
          },
          teamId: orgTeam.id,
          userId: user.id,
        },
      });

      const response = await request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/${eventTypeRoutingForm.id}/responses?start=2050-09-05&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          question1: "answer1", // This matches the route condition
          question2: "answer2",
        })
        .expect(201);

      const responseBody = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const data = responseBody.data;
      expect(data).toBeDefined();
      expect(data.routing?.responseId).toBeDefined();
      expect(typeof data.routing?.responseId).toBe("number");
      expect(data.eventTypeId).toEqual(routingEventType.id);
      expect(data.slots).toBeDefined();
      expect(typeof data.slots).toBe("object");
      expect(data.routing?.teamMemberIds).toBeDefined();

      // Clean up
      await prismaWriteService.prisma.app_RoutingForms_Form.delete({
        where: { id: eventTypeRoutingForm.id },
      });
    });

    it("should return 500 when event type is not found", async () => {
      // Create a routing form with an invalid eventTypeId
      const routingFormWithInvalidEventType = await prismaWriteService.prisma.app_RoutingForms_Form.create({
        data: {
          name: "Test Routing Form with Invalid Event Type",
          description: "Test Description",
          disabled: false,
          routes: [
            {
              id: "route-1",
              queryValue: {
                id: "route-1",
                type: "group",
                children1: {
                  "rule-1": {
                    type: "rule",
                    properties: {
                      field: "question1",
                      operator: "equal",
                      value: ["answer1"],
                      valueSrc: ["value"],
                      valueType: ["text"],
                    },
                  },
                },
              },
              action: {
                type: "eventTypeRedirectUrl",
                eventTypeId: 99999, // Invalid event type ID
                value: `team/${orgTeam.slug}/non-existent-event-type`,
              },
              isFallback: false,
            },
            {
              id: "fallback-route",
              action: { type: "customPageMessage", value: "Fallback Message" },
              isFallback: true,
              queryValue: { id: "fallback-route", type: "group" },
            },
          ],
          fields: [
            {
              id: "question1",
              type: "text",
              label: "Question 1",
              required: true,
              identifier: "question1",
            },
          ],
          settings: {
            emailOwnerOnSubmission: false,
          },
          teamId: orgTeam.id,
          userId: user.id,
        },
      });

      // Try to create a response for the form with invalid event type
      const response = await request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/${routingFormWithInvalidEventType.id}/responses?start=2050-09-05&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          question1: "answer1",
        });

      expect(response.status).toBe(500);

      // Clean up the form
      await prismaWriteService.prisma.app_RoutingForms_Form.delete({
        where: { id: routingFormWithInvalidEventType.id },
      });
    });

    it("should return external redirect URL when routing to external URL", async () => {
      // Create a routing form with external redirect action
      const externalRoutingForm = await prismaWriteService.prisma.app_RoutingForms_Form.create({
        data: {
          name: "Test External Routing Form",
          description: "Test Description for External Redirect",
          disabled: false,
          routes: [
            {
              id: "external-route-1",
              queryValue: {
                id: "external-route-1",
                type: "group",
                children1: {
                  "rule-1": {
                    type: "rule",
                    properties: {
                      field: "question1",
                      operator: "equal",
                      value: ["external"],
                      valueSrc: ["value"],
                      valueType: ["text"],
                    },
                  },
                },
              },
              action: {
                type: "externalRedirectUrl",
                value: "https://example.com/external-booking",
              },
              isFallback: false,
            },
            {
              id: "fallback-route",
              action: { type: "customPageMessage", value: "Fallback Message" },
              isFallback: true,
              queryValue: { id: "fallback-route", type: "group" },
            },
          ],
          fields: [
            {
              id: "question1",
              type: "text",
              label: "Question 1",
              required: true,
              identifier: "question1",
            },
          ],
          settings: {
            emailOwnerOnSubmission: false,
          },
          teamId: orgTeam.id,
          userId: user.id,
        },
      });

      const response = await request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/teams/${orgTeam.id}/routing-forms/${externalRoutingForm.id}/responses?start=2050-09-05&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          question1: "external", // This matches the route condition for external redirect
        })
        .expect(201);

      const responseBody = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const data = responseBody.data;
      expect(data).toBeDefined();
      expect(data.routingExternalRedirectUrl).toBeDefined();
      expect(data.routingExternalRedirectUrl).toContain("https://example.com/external-booking");
      expect(data.routingExternalRedirectUrl).toContain("cal.action=externalRedirectUrl");

      // Verify that it doesn't contain event type routing data
      expect(data.eventTypeId).toBeUndefined();
      expect(data.slots).toBeUndefined();
      expect(data.routing).toBeUndefined();
      expect(data.routingCustomMessage).toBeUndefined();

      // Clean up the external routing form
      await prismaWriteService.prisma.app_RoutingForms_Form.delete({
        where: { id: externalRoutingForm.id },
      });
    });
  });

  describe(`PATCH /v2/organizations/:orgId/routing-forms/:routingFormId/responses/:responseId`, () => {
    it("should not update routing form response for non existing org", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/99999/routing-forms/${routingFormId}/responses/${routingFormResponseId}`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(403);
    });

    it("should not update routing form response for non existing form", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/routing-forms/non-existent-id/responses/${routingFormResponseId}`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(404);
    });

    it("should not update routing form response for non existing response", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/routing-forms/${routingFormId}/responses/99999`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(404);
    });

    it("should not update routing form response without authentication", async () => {
      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/${org.id}/routing-forms/${routingFormId}/responses/${routingFormResponseId}`
        )
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(401);
    });

    it("should update routing form response", async () => {
      const updatedResponse = { question1: "updated_answer1", question2: "updated_answer2" };
      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/${org.id}/routing-forms/${routingFormId}/responses/${routingFormResponseId}`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ response: updatedResponse })
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data;
          expect(data).toBeDefined();
          expect(data.id).toEqual(routingFormResponseId);
          expect(data.formId).toEqual(routingFormId);
          expect(data.response).toEqual(updatedResponse);
        });
    });
  });

  afterAll(async () => {
    if (routingFormResponseId) {
      await routingFormsRepositoryFixture.deleteResponse(routingFormResponseId);
    }
    await routingFormsRepositoryFixture.delete(routingFormId);
    await prismaWriteService.prisma.eventType.delete({
      where: { id: routingEventType.id },
    });
    await userRepositoryFixture.deleteByEmail(user.email);
    await organizationsRepositoryFixture.delete(org.id);
    await app.close();
  });
});
