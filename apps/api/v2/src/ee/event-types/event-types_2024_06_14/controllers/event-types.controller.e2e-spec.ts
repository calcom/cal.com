import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { PlatformOAuthClient, Team, User, Schedule } from "@prisma/client";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { SchedulesRepositoryFixture } from "test/fixtures/repository/schedules.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_06_14 } from "@calcom/platform-constants";
import {
  ApiSuccessResponse,
  CreateEventTypeInput_2024_06_14,
  EventTypeOutput_2024_06_14,
  UpdateEventTypeInput_2024_06_14,
} from "@calcom/platform-types";

describe("Event types Endpoints", () => {
  describe("Not authenticated", () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter],
        imports: [AppModule, UsersModule, EventTypesModule_2024_06_14, TokensModule],
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
    let schedulesRepostoryFixture: SchedulesRepositoryFixture;

    const userEmail = "event-types-test-e2e@api.com";
    const falseTestEmail = "false-event-types@api.com";
    const name = "bob-the-builder";
    const username = name;
    let eventType: EventTypeOutput_2024_06_14;
    let user: User;
    let falseTestUser: User;
    let firstSchedule: Schedule;
    let secondSchedule: Schedule;
    let falseTestSchedule: Schedule;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          providers: [PrismaExceptionFilter, HttpExceptionFilter],
          imports: [AppModule, UsersModule, EventTypesModule_2024_06_14, TokensModule],
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
      schedulesRepostoryFixture = new SchedulesRepositoryFixture(moduleRef);

      organization = await teamRepositoryFixture.create({ name: "organization" });
      oAuthClient = await createOAuthClient(organization.id);
      user = await userRepositoryFixture.create({
        email: userEmail,
        name,
        username,
      });

      falseTestUser = await userRepositoryFixture.create({
        email: falseTestEmail,
        name: "false-test",
        username: falseTestEmail,
      });

      firstSchedule = await schedulesRepostoryFixture.create({
        userId: user.id,
        name: "work",
        timeZone: "Europe/Rome",
      });

      secondSchedule = await schedulesRepostoryFixture.create({
        userId: user.id,
        name: "chill",
        timeZone: "Europe/Rome",
      });

      falseTestSchedule = await schedulesRepostoryFixture.create({
        userId: falseTestUser.id,
        name: "work",
        timeZone: "Europe/Rome",
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

    it("should not allow creating an event type with schedule user does not own", async () => {
      const scheduleId = falseTestSchedule.id;

      const body: CreateEventTypeInput_2024_06_14 = {
        title: "Coding class",
        slug: "coding-class",
        description: "Let's learn how to code like a pro.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "cal-video",
          },
        ],
        bookingFields: [
          {
            type: "select",
            label: "select which language you want to learn",
            slug: "select-language",
            required: true,
            placeholder: "select language",
            options: ["javascript", "python", "cobol"],
          },
        ],
        scheduleId,
      };

      return request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send(body)
        .expect(404);
    });

    it("should create an event type", async () => {
      const body: CreateEventTypeInput_2024_06_14 = {
        title: "Coding class",
        slug: "coding-class",
        description: "Let's learn how to code like a pro.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "cal-video",
          },
        ],
        bookingFields: [
          {
            type: "select",
            label: "select which language you want to learn",
            slug: "select-language",
            required: true,
            placeholder: "select language",
            options: ["javascript", "python", "cobol"],
          },
        ],
        scheduleId: firstSchedule.id,
      };

      return request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send(body)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
          const createdEventType = responseBody.data;
          expect(createdEventType).toHaveProperty("id");
          expect(createdEventType.title).toEqual(body.title);
          expect(createdEventType.description).toEqual(body.description);
          expect(createdEventType.lengthInMinutes).toEqual(body.lengthInMinutes);
          expect(createdEventType.locations).toEqual(body.locations);
          expect(createdEventType.bookingFields).toEqual(body.bookingFields);
          expect(createdEventType.ownerId).toEqual(user.id);
          expect(createdEventType.scheduleId).toEqual(firstSchedule.id);

          eventType = responseBody.data;
        });
    });

    it("should update event type", async () => {
      const newTitle = "Coding class in Italian!";

      const body: UpdateEventTypeInput_2024_06_14 = {
        title: newTitle,
        scheduleId: secondSchedule.id,
      };

      return request(app.getHttpServer())
        .patch(`/api/v2/event-types/${eventType.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
          const updatedEventType = responseBody.data;
          expect(updatedEventType.title).toEqual(body.title);

          expect(updatedEventType.id).toEqual(eventType.id);
          expect(updatedEventType.title).toEqual(newTitle);
          expect(updatedEventType.description).toEqual(eventType.description);
          expect(updatedEventType.lengthInMinutes).toEqual(eventType.lengthInMinutes);
          expect(updatedEventType.locations).toEqual(eventType.locations);
          expect(updatedEventType.bookingFields).toEqual(eventType.bookingFields);
          expect(updatedEventType.ownerId).toEqual(user.id);
          expect(updatedEventType.scheduleId).toEqual(secondSchedule.id);

          eventType.title = newTitle;
          eventType.scheduleId = secondSchedule.id;
        });
    });

    it("should not allow to update event type with scheduleId user does not own", async () => {
      const body: UpdateEventTypeInput_2024_06_14 = {
        scheduleId: falseTestSchedule.id,
      };

      return request(app.getHttpServer())
        .patch(`/api/v2/event-types/${eventType.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send(body)
        .expect(404);
    });

    it(`/GET/:id`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types/${eventType.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        // note: bearer token value mocked using "withAccessTokenAuth" for user which id is used when creating event type above
        .set("Authorization", `Bearer whatever`)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
      const fetchedEventType = responseBody.data;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(fetchedEventType.id).toEqual(eventType.id);
      expect(fetchedEventType.title).toEqual(eventType.title);
      expect(fetchedEventType.description).toEqual(eventType.description);
      expect(fetchedEventType.lengthInMinutes).toEqual(eventType.lengthInMinutes);
      expect(fetchedEventType.locations).toEqual(eventType.locations);
      expect(fetchedEventType.bookingFields).toEqual(eventType.bookingFields);
      expect(fetchedEventType.ownerId).toEqual(user.id);
    });

    it(`/GET/even-types by username`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types?username=${username}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        // note: bearer token value mocked using "withAccessTokenAuth" for user which id is used when creating event type above
        .set("Authorization", `Bearer whatever`)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(1);

      const fetchedEventType = responseBody.data?.[0];

      expect(fetchedEventType?.id).toEqual(eventType.id);
      expect(fetchedEventType?.title).toEqual(eventType.title);
      expect(fetchedEventType?.description).toEqual(eventType.description);
      expect(fetchedEventType?.lengthInMinutes).toEqual(eventType.lengthInMinutes);
      expect(fetchedEventType?.locations).toEqual(eventType.locations);
      expect(fetchedEventType?.bookingFields).toEqual(eventType.bookingFields);
      expect(fetchedEventType?.ownerId).toEqual(user.id);
    });

    it(`/GET/event-types by username and eventSlug`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types?username=${username}&eventSlug=${eventType.slug}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        // note: bearer token value mocked using "withAccessTokenAuth" for user which id is used when creating event type above
        .set("Authorization", `Bearer whatever`)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;
      const fetchedEventType = responseBody.data[0];

      expect(fetchedEventType?.id).toEqual(eventType.id);
      expect(fetchedEventType?.title).toEqual(eventType.title);
      expect(fetchedEventType?.description).toEqual(eventType.description);
      expect(fetchedEventType?.lengthInMinutes).toEqual(eventType.lengthInMinutes);
      expect(fetchedEventType?.locations).toEqual(eventType.locations);
      expect(fetchedEventType?.bookingFields).toEqual(eventType.bookingFields);
      expect(fetchedEventType?.ownerId).toEqual(user.id);
    });

    it(`/GET/:id not existing`, async () => {
      await request(app.getHttpServer())
        .get(`/api/v2/event-types/1000`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        // note: bearer token value mocked using "withAccessTokenAuth" for user which id is used when creating event type above
        .set("Authorization", `Bearer whatever`)
        .expect(404);
    });

    it("should delete event type", async () => {
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
      try {
        await userRepositoryFixture.delete(falseTestUser.id);
      } catch (e) {
        // User might have been deleted by the test
      }
      await app.close();
    });
  });
});
