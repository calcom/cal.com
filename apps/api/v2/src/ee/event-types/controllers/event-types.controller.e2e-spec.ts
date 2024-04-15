import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { EventTypesModule } from "@/ee/event-types/event-types.module";
import { CreateEventTypeInput } from "@/ee/event-types/inputs/create-event-type.input";
import { UpdateEventTypeInput } from "@/ee/event-types/inputs/update-event-type.input";
import { GetEventTypePublicOutput } from "@/ee/event-types/outputs/get-event-type-public.output";
import { GetEventTypeOutput } from "@/ee/event-types/outputs/get-event-type.output";
import { GetEventTypesPublicOutput } from "@/ee/event-types/outputs/get-event-types-public.output";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { EventType, PlatformOAuthClient, Team, User } from "@prisma/client";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withAccessTokenAuth } from "test/utils/withAccessTokenAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { EventTypesByViewer, EventTypesPublic } from "@calcom/platform-libraries";
import { ApiSuccessResponse } from "@calcom/platform-types";

describe("Event types Endpoints", () => {
  describe("Not authenticated", () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter],
        imports: [AppModule, UsersModule, EventTypesModule, TokensModule],
      })
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    it(`/GET/:id`, () => {
      return request(app.getHttpServer()).get("/api/v2/event-types/100").expect(401);
    });

    afterAll(async () => {
      await app.close();
    });
  });

  describe("User Authenticated", () => {
    let app: INestApplication;

    let oAuthClient: PlatformOAuthClient;
    let organization: Team;
    let userRepositoryFixture: UserRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;

    const userEmail = "event-types-test-e2e@api.com";
    const name = "bob-the-builder";
    const username = name;
    let eventType: EventType;
    let user: User;

    beforeAll(async () => {
      const moduleRef = await withAccessTokenAuth(
        userEmail,
        Test.createTestingModule({
          providers: [PrismaExceptionFilter, HttpExceptionFilter],
          imports: [AppModule, UsersModule, EventTypesModule, TokensModule],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

      organization = await teamRepositoryFixture.create({ name: "organization" });
      oAuthClient = await createOAuthClient(organization.id);
      user = await userRepositoryFixture.create({
        email: userEmail,
        name,
        username,
      });

      await app.init();
    });

    async function createOAuthClient(organizationId: number) {
      const data = {
        logo: "logo-url",
        name: "name",
        redirectUris: ["redirect-uri"],
        permissions: 32,
      };
      const secret = "secret";

      const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
      return client;
    }

    it("should be defined", () => {
      expect(oauthClientRepositoryFixture).toBeDefined();
      expect(userRepositoryFixture).toBeDefined();
      expect(oAuthClient).toBeDefined();
      expect(user).toBeDefined();
    });

    it("should create an event type", async () => {
      const body: CreateEventTypeInput = {
        title: "Test Event Type",
        slug: "test-event-type",
        description: "A description of the test event type.",
        length: 60,
        hidden: false,
        locations: [
          {
            type: "Online",
            link: "https://example.com/meet",
            displayLocationPublicly: true,
          },
        ],
      };

      return request(app.getHttpServer())
        .post("/api/v2/event-types")
        .send(body)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventType> = response.body;
          expect(responseBody.data).toHaveProperty("id");
          expect(responseBody.data.title).toEqual(body.title);
          eventType = responseBody.data;
        });
    });

    it("should update event type", async () => {
      const newTitle = "Updated title";

      const body: UpdateEventTypeInput = {
        title: newTitle,
      };

      return request(app.getHttpServer())
        .patch(`/api/v2/event-types/${eventType.id}`)
        .send(body)
        .expect(200)
        .then(async () => {
          eventType.title = newTitle;
        });
    });

    it(`/GET/:id`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types/${eventType.id}`)
        // note: bearer token value mocked using "withAccessTokenAuth" for user which id is used when creating event type above
        .set("Authorization", `Bearer whatever`)
        .expect(200);

      const responseBody: GetEventTypeOutput = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.eventType.id).toEqual(eventType.id);
      expect(responseBody.data.eventType.title).toEqual(eventType.title);
      expect(responseBody.data.eventType.slug).toEqual(eventType.slug);
      expect(responseBody.data.eventType.userId).toEqual(user.id);
    });

    it(`/GET/:username/public`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types/${username}/public`)
        // note: bearer token value mocked using "withAccessTokenAuth" for user which id is used when creating event type above
        .set("Authorization", `Bearer whatever`)
        .expect(200);

      const responseBody: GetEventTypesPublicOutput = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(1);
      expect(responseBody.data?.[0]?.id).toEqual(eventType.id);
      expect(responseBody.data?.[0]?.title).toEqual(eventType.title);
      expect(responseBody.data?.[0]?.slug).toEqual(eventType.slug);
      expect(responseBody.data?.[0]?.length).toEqual(eventType.length);
    });

    it(`/GET/:username/:eventSlug/public`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types/${username}/${eventType.slug}/public`)
        // note: bearer token value mocked using "withAccessTokenAuth" for user which id is used when creating event type above
        .set("Authorization", `Bearer whatever`)
        .expect(200);

      const responseBody: GetEventTypePublicOutput = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.id).toEqual(eventType.id);
      expect(responseBody.data?.title).toEqual(eventType.title);
      expect(responseBody.data?.slug).toEqual(eventType.slug);
      expect(responseBody.data?.length).toEqual(eventType.length);
    });

    it(`/GET/`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types`)
        // note: bearer token value mocked using "withAccessTokenAuth" for user which id is used when creating event type above
        .set("Authorization", `Bearer whatever`)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypesByViewer> = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.eventTypeGroups).toBeDefined();
      expect(responseBody.data.eventTypeGroups).toBeDefined();
      expect(responseBody.data.eventTypeGroups[0]).toBeDefined();
      expect(responseBody.data.eventTypeGroups[0].profile).toBeDefined();
      expect(responseBody.data.eventTypeGroups?.[0]?.profile?.name).toEqual(name);
      expect(responseBody.data.eventTypeGroups?.[0]?.eventTypes?.[0]?.id).toEqual(eventType.id);
      expect(responseBody.data.profiles?.[0]?.name).toEqual(name);
    });

    it(`/GET/public/:username/`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types/${username}/public`)
        // note: bearer token value mocked using "withAccessTokenAuth" for user which id is used when creating event type above
        .set("Authorization", `Bearer whatever`)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypesPublic> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.length).toEqual(1);
      expect(responseBody.data[0].id).toEqual(eventType.id);
    });

    it(`/GET/:id not existing`, async () => {
      await request(app.getHttpServer())
        .get(`/api/v2/event-types/1000`)
        // note: bearer token value mocked using "withAccessTokenAuth" for user which id is used when creating event type above
        .set("Authorization", `Bearer whatever`)
        .expect(404);
    });

    it("should delete schedule", async () => {
      return request(app.getHttpServer()).delete(`/api/v2/event-types/${eventType.id}`).expect(200);
    });

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      try {
        await eventTypesRepositoryFixture.delete(eventType.id);
      } catch (e) {
        // Event type might have been deleted by the test
      }
      try {
        await userRepositoryFixture.delete(user.id);
      } catch (e) {
        // User might have been deleted by the test
      }
      await app.close();
    });
  });
});
