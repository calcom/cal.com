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
  let orgAdminApiKey: string;
  let nonOrgAdminUserApiKeyString: string;
  let teamRoutingForm: App_RoutingForms_Form;
  let userRoutingForm: App_RoutingForms_Form;
  let teamRoutingFormResponse1: App_RoutingForms_FormResponse;
  let teamRoutingFormResponse2: App_RoutingForms_FormResponse;

  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;

  let orgAdminUser: User;
  let nonOrgAdminUser: User;
  const userEmail = `OrganizationsRoutingFormsResponsesController-key-bookings-2024-08-13-user-${randomString()}@api.com`;
  let profileRepositoryFixture: ProfileRepositoryFixture;
  let routingEventType: {
    id: number;
    slug: string | null;
    teamId: number | null;
    userId: number | null;
    title: string;
  };
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

    orgAdminUser = await userRepositoryFixture.create({
      email: userEmail,
    });

    nonOrgAdminUser = await userRepositoryFixture.create({
      email: `non-org-admin-user-${randomString()}@api.com`,
    });

    await membershipsRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: orgAdminUser.id } },
      team: { connect: { id: org.id } },
      accepted: true,
    });

    await profileRepositoryFixture.create({
      uid: `usr-${orgAdminUser.id}`,
      username: userEmail,
      organization: {
        connect: {
          id: org.id,
        },
      },
      user: {
        connect: {
          id: orgAdminUser.id,
        },
      },
    });
    const now = new Date();
    now.setDate(now.getDate() + 1);
    const { keyString } = await apiKeysRepositoryFixture.createApiKey(orgAdminUser.id, null);
    orgAdminApiKey = `${keyString}`;

    const { keyString: _nonOrgAdminUserApiKeyString } = await apiKeysRepositoryFixture.createApiKey(
      nonOrgAdminUser.id,
      null
    );
    nonOrgAdminUserApiKeyString = `${_nonOrgAdminUserApiKeyString}`;

    // Create an event type for routing form to route to
    routingEventType = await prismaWriteService.prisma.eventType.create({
      data: {
        title: "Test Event Type",
        slug: "test-event-type",
        length: 30,
        userId: orgAdminUser.id,
        teamId: null,
      },
    });

    const routingFormData = {
      name: "Test Routing Form",
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
            value: `team/${team.slug}/${routingEventType.slug}`,
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
      userId: orgAdminUser.id,
    };

    userRoutingForm = await prismaWriteService.prisma.app_RoutingForms_Form.create({
      data: {
        ...routingFormData,
        // User Routing Form has teamId=null
        teamId: null,
      },
    });

    // Patch response and get Responses endpoints right now work for teams only
    // We need to fix them in a followup PR
    teamRoutingForm = await prismaWriteService.prisma.app_RoutingForms_Form.create({
      data: {
        ...routingFormData,
        teamId: team.id,
      },
    });

    teamRoutingFormResponse1 = await prismaWriteService.prisma.app_RoutingForms_FormResponse.create({
      data: {
        formId: teamRoutingForm.id,
        response: JSON.stringify({ question1: "answer1", question2: "answer2" }),
      },
    });

    teamRoutingFormResponse2 = await prismaWriteService.prisma.app_RoutingForms_FormResponse.create({
      data: {
        formId: teamRoutingForm.id,
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
        .get(`/v2/organizations/99999/routing-forms/${teamRoutingForm.id}/responses`)
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .expect(403);
    });

    it("should not get routing form responses for non existing form", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/routing-forms/non-existent-id/responses`)
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .expect(404);
    });

    it("should not get routing form responses without authentication", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/routing-forms/${teamRoutingForm.id}/responses`)
        .expect(401);
    });

    it("should get routing form responses", async () => {
      const createdAt = new Date(teamRoutingFormResponse1.createdAt);
      createdAt.setHours(createdAt.getHours() - 1);
      const isoStringCreatedAt = createdAt.toISOString();
      return request(app.getHttpServer())
        .get(
          `/v2/organizations/${org.id}/routing-forms/${teamRoutingForm.id}/responses?skip=0&take=2&sortUpdatedAt=asc&sortCreatedAt=desc&afterCreatedAt=${isoStringCreatedAt}`
        )
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const responses = responseBody.data as App_RoutingForms_FormResponse[];
          expect(responses).toBeDefined();
          expect(responses.length).toBeGreaterThan(0);
          expect(responses.find((response) => response.id === teamRoutingFormResponse1.id)).toBeDefined();
          expect(responses.find((response) => response.id === teamRoutingFormResponse1.id)?.formId).toEqual(
            teamRoutingFormResponse1.formId
          );
          expect(responses.find((response) => response.id === teamRoutingFormResponse2.id)).toBeDefined();
          expect(responses.find((response) => response.id === teamRoutingFormResponse2.id)?.formId).toEqual(
            teamRoutingFormResponse2.formId
          );
        });
    });
  });

  describe(`POST /v2/organizations/:orgId/routing-forms/:routingFormId/responses`, () => {
    it("should return 403 when organization does not exist", async () => {
      return request(app.getHttpServer())
        .post(
          `/v2/organizations/99999/routing-forms/${userRoutingForm.id}/responses?start=2050-09-05&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .send({
          question1: "answer1",
        })
        .expect(403);
    });

    it("should return 404 when routing form does not exist and org admin tries to access it", async () => {
      return request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/routing-forms/non-existent-id/responses?start=2050-09-05&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .send({
          question1: "answer1",
        })
        .expect(404)
        .then((response) => {
          expect(response.body.error.message).toContain(`Routing form not found`);
        });
    });

    it("should return 403 when routing form is accessed by a non-org-admin user and the form isn't created by the user", async () => {
      // Create a second user
      const otherUser = await userRepositoryFixture.create({
        email: `other-user-${randomString()}@api.com`,
      });

      // Create a routing form that belongs to the other user
      const otherUserRoutingForm = await prismaWriteService.prisma.app_RoutingForms_Form.create({
        data: {
          name: "Other User's Routing Form",
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
                value: `team/${team.slug}/${routingEventType.slug}`,
              },
              isFallback: false,
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
          // User Routing Form has teamId=null
          teamId: null,
          userId: otherUser.id, // This form belongs to otherUser, not the authenticated user
        },
      });

      // Try to access the routing form that belongs to the other user
      const response = await request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/routing-forms/${otherUserRoutingForm.id}/responses?start=2050-09-05&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${nonOrgAdminUserApiKeyString}` })
        .send({
          question1: "answer1",
        });

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain(
        `Routing Form with id=${otherUserRoutingForm.id} is not a user Routing Form owned by user with id=${nonOrgAdminUser.id}.`
      );

      // Clean up
      await prismaWriteService.prisma.app_RoutingForms_Form.delete({
        where: { id: otherUserRoutingForm.id },
      });
      await prismaWriteService.prisma.user.delete({
        where: { id: otherUser.id },
      });
    });

    it("should return 401 when authentication token is missing", async () => {
      return request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/routing-forms/${userRoutingForm.id}/responses?start=2050-09-05&end=2050-09-06`
        )
        .send({
          question1: "answer1",
        })
        .expect(401);
    });

    it("should create response and return available slots when routing to event type", async () => {
      return request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/routing-forms/${userRoutingForm.id}/responses?start=2050-09-05&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .send({
          question1: "answer1", // This matches the route condition
          question2: "answer2",
        })
        .expect(201)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data;
          expect(data).toBeDefined();
          expect(data.routing?.responseId).toBeDefined();
          expect(typeof data.routing?.responseId).toBe("number");
          expect(data.eventTypeId).toEqual(routingEventType.id);
          expect(data.slots).toBeDefined();
          expect(typeof data.slots).toBe("object");
        });
    });

    it("should return 400 when required form fields are missing", async () => {
      return request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/routing-forms/${userRoutingForm.id}/responses?start=2050-09-05&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .send({
          question2: "answer2", // Missing required question1
        })
        .expect(400);
    });

    it("should create response and return custom message if the routing is to custom page", async () => {
      return request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/routing-forms/${userRoutingForm.id}/responses?start=2050-09-05&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .send({
          question1: "different-answer", // This won't match any route
          question2: "answer2",
        })
        .expect(201)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data;
          expect(data).toBeDefined();
          expect(data.routingCustomMessage).toBeDefined();
          expect(data.routingCustomMessage).toBe("Fallback Message");
        });
    });

    it("should return 400 when required slot query parameters are missing", async () => {
      // Missing start parameter
      await request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/routing-forms/${userRoutingForm.id}/responses?end=2050-09-06`)
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .send({
          question1: "answer1",
          question2: "answer2",
        })
        .expect(400);

      // Missing end parameter
      await request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/routing-forms/${userRoutingForm.id}/responses?start=2050-09-05`)
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .send({
          question1: "answer1",
          question2: "answer2",
        })
        .expect(400);
    });

    it("should return 400 when date parameters have invalid format", async () => {
      return request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/routing-forms/${userRoutingForm.id}/responses?start=invalid-date&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .send({
          question1: "answer1",
        })
        .expect(400);
    });

    it("should return 400 when end date is before start date", async () => {
      return request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/routing-forms/${userRoutingForm.id}/responses?start=2050-09-10&end=2050-09-05`
        )
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .send({
          question1: "answer1",
        })
        .expect(400);
    });

    it("should return 403 when user lacks permission to access organization", async () => {
      // Create a new user without organization access
      const unauthorizedUser = await userRepositoryFixture.create({
        email: `unauthorized-user-${randomString()}@api.com`,
      });

      const { keyString: unauthorizedApiKey } = await apiKeysRepositoryFixture.createApiKey(
        unauthorizedUser.id,
        null
      );

      const response = await request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/routing-forms/${userRoutingForm.id}/responses?start=2050-09-05&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${unauthorizedApiKey}` })
        .send({
          question1: "answer1",
        });

      expect(response.status).toBe(403);

      // Clean up
      await prismaWriteService.prisma.user.delete({
        where: { id: unauthorizedUser.id },
      });
    });

    it("should handle queued response creation", async () => {
      return request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/routing-forms/${userRoutingForm.id}/responses?start=2050-09-05&end=2050-09-06&queueResponse=true`
        )
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .send({
          question1: "answer1",
          question2: "answer2",
        })
        .expect(201)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data;
          expect(data.routing?.queuedResponseId).toBeDefined();
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
                value: `team/${team.slug}/non-existent-event-type`,
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
          // User Routing Form has teamId=null
          teamId: null,
          userId: orgAdminUser.id,
        },
      });

      // Try to create a response for the form with invalid event type
      const response = await request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/routing-forms/${routingFormWithInvalidEventType.id}/responses?start=2050-09-05&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
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
      const externalRedirectRoutingForm = await prismaWriteService.prisma.app_RoutingForms_Form.create({
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
          teamId: null,
          userId: orgAdminUser.id,
        },
      });

      const response = await request(app.getHttpServer())
        .post(
          `/v2/organizations/${org.id}/routing-forms/${externalRedirectRoutingForm.id}/responses?start=2050-09-05&end=2050-09-06`
        )
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
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
        where: { id: externalRedirectRoutingForm.id },
      });
    });
  });

  describe(`PATCH /v2/organizations/:orgId/routing-forms/:routingFormId/responses/:responseId`, () => {
    it("should not update routing form response for non existing org", async () => {
      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/99999/routing-forms/${teamRoutingForm.id}/responses/${teamRoutingFormResponse1.id}`
        )
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(403);
    });

    it("should not update routing form response for non existing form", async () => {
      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/${org.id}/routing-forms/non-existent-id/responses/${teamRoutingFormResponse1.id}`
        )
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(404);
    });

    it("should not update routing form response for non existing response", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/routing-forms/${teamRoutingForm.id}/responses/99999`)
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(404);
    });

    it("should not update routing form response without authentication", async () => {
      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/${org.id}/routing-forms/${teamRoutingForm.id}/responses/${teamRoutingFormResponse1.id}`
        )
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(401);
    });

    it("should update routing form response", async () => {
      const updatedResponse = { question1: "updated_answer1", question2: "updated_answer2" };
      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/${org.id}/routing-forms/${teamRoutingForm.id}/responses/${teamRoutingFormResponse1.id}`
        )
        .set({ Authorization: `Bearer cal_test_${orgAdminApiKey}` })
        .send({ response: updatedResponse })
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data;
          expect(data).toBeDefined();
          expect(data.id).toEqual(teamRoutingFormResponse1.id);
          expect(data.formId).toEqual(teamRoutingFormResponse1.formId);
          expect(data.response).toEqual(updatedResponse);
        });
    });
  });

  afterAll(async () => {
    await prismaWriteService.prisma.app_RoutingForms_FormResponse.delete({
      where: {
        id: teamRoutingFormResponse1.id,
      },
    });
    await prismaWriteService.prisma.app_RoutingForms_FormResponse.delete({
      where: {
        id: teamRoutingFormResponse2.id,
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
        id: orgAdminUser.id,
      },
    });

    await app.close();
  });
});
