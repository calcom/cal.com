import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { Editable } from "@/ee/event-types/event-types_2024_04_15//inputs/enums/editable";
import { EventTypesModule_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/event-types.module";
import { CreateEventTypeInput_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/inputs/create-event-type.input";
import { BaseField } from "@/ee/event-types/event-types_2024_04_15/inputs/enums/field-type";
import { UpdateEventTypeInput_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/inputs/update-event-type.input";
import { GetEventTypePublicOutput } from "@/ee/event-types/event-types_2024_04_15/outputs/get-event-type-public.output";
import { GetEventTypeOutput } from "@/ee/event-types/event-types_2024_04_15/outputs/get-event-type.output";
import { GetEventTypesPublicOutput } from "@/ee/event-types/event-types_2024_04_15/outputs/get-event-types-public.output";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import {
  SUCCESS_STATUS,
  VERSION_2024_06_11,
  VERSION_2024_04_15,
  CAL_API_VERSION_HEADER,
} from "@calcom/platform-constants";
import {
  EventTypesByViewer,
  eventTypeBookingFields,
  eventTypeLocations,
  EventTypesPublic,
} from "@calcom/platform-libraries/event-types";
import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { EventType, PlatformOAuthClient, Team, User } from "@calcom/prisma/client";

describe("Event types Endpoints", () => {
  describe("Not authenticated", () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter],
        imports: [AppModule, UsersModule, EventTypesModule_2024_04_15, TokensModule],
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

    const userEmail = `event-types-2024-04-15-user-${randomString()}@api.com`;
    const name = `event-types-2024-04-15-user-${randomString()}`;
    const username = name;
    let eventType: EventType;
    let user: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          providers: [PrismaExceptionFilter, HttpExceptionFilter],
          imports: [AppModule, UsersModule, EventTypesModule_2024_04_15, TokensModule],
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

      organization = await teamRepositoryFixture.create({
        name: `event-types-organization-${randomString()}`,
      });
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
      const body: CreateEventTypeInput_2024_04_15 = {
        title: "Test Event Type",
        slug: `event-types-event-type-${randomString()}`,
        description: "A description of the test event type.",
        length: 60,
        hidden: false,
        disableGuests: true,
        slotInterval: 15,
        afterEventBuffer: 5,
        beforeEventBuffer: 10,
        minimumBookingNotice: 120,
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
        .set(CAL_API_VERSION_HEADER, VERSION_2024_04_15)
        .send(body)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventType> = response.body;
          expect(responseBody.data).toHaveProperty("id");
          expect(responseBody.data.title).toEqual(body.title);
          expect(responseBody.data.disableGuests).toEqual(body.disableGuests);
          expect(responseBody.data.slotInterval).toEqual(body.slotInterval);
          expect(responseBody.data.minimumBookingNotice).toEqual(body.minimumBookingNotice);
          expect(responseBody.data.beforeEventBuffer).toEqual(body.beforeEventBuffer);
          expect(responseBody.data.afterEventBuffer).toEqual(body.afterEventBuffer);

          eventType = responseBody.data;
        });
    });

    it("should update event type", async () => {
      const newTitle = "Updated title";

      const body: UpdateEventTypeInput_2024_04_15 = {
        title: newTitle,
        disableGuests: false,
        slotInterval: 30,
        afterEventBuffer: 10,
        beforeEventBuffer: 15,
        minimumBookingNotice: 240,
      };

      return request(app.getHttpServer())
        .patch(`/api/v2/event-types/${eventType.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_04_15)
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventType> = response.body;
          expect(responseBody.data.title).toEqual(newTitle);
          expect(responseBody.data.disableGuests).toEqual(body.disableGuests);
          expect(responseBody.data.slotInterval).toEqual(body.slotInterval);
          expect(responseBody.data.minimumBookingNotice).toEqual(body.minimumBookingNotice);
          expect(responseBody.data.beforeEventBuffer).toEqual(body.beforeEventBuffer);
          expect(responseBody.data.afterEventBuffer).toEqual(body.afterEventBuffer);

          eventType.title = newTitle;
          eventType.disableGuests = responseBody.data.disableGuests ?? false;
          eventType.slotInterval = body.slotInterval ?? null;
          eventType.minimumBookingNotice = body.minimumBookingNotice ?? 10;
          eventType.beforeEventBuffer = body.beforeEventBuffer ?? 10;
          eventType.afterEventBuffer = body.afterEventBuffer ?? 10;
        });
    });

    it("should return 400 if param event type id is null", async () => {
      const locations = [{ type: "inPerson", address: "123 Main St" }];

      const body: UpdateEventTypeInput_2024_04_15 = {
        locations,
      };

      return request(app.getHttpServer()).patch(`/api/v2/event-types/null`).send(body).expect(400);
    });

    it("should update event type locations", async () => {
      const locations = [{ type: "inPerson", address: "123 Main St" }];

      const body: UpdateEventTypeInput_2024_04_15 = {
        locations,
      };

      return request(app.getHttpServer())
        .patch(`/api/v2/event-types/${eventType.id}`)
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventType> = response.body;
          const responseLocations = eventTypeLocations.parse(responseBody.data.locations);
          expect(responseLocations).toBeDefined();
          expect(responseLocations.length).toEqual(locations.length);
          expect(responseLocations).toEqual(locations);
          eventType.locations = responseLocations;
        });
    });

    it("should update event type bookingFields", async () => {
      const bookingFieldName = "location-name";
      const bookingFields = [
        {
          name: bookingFieldName,
          type: BaseField.radio,
          label: "Location",
          options: [
            {
              label: "Via Bari 10, Roma, 90119, Italy",
              value: "Via Bari 10, Roma, 90119, Italy",
            },
            {
              label: "Via Reale 28, Roma, 9001, Italy",
              value: "Via Reale 28, Roma, 9001, Italy",
            },
          ],
          sources: [
            {
              id: "user",
              type: "user",
              label: "User",
              fieldRequired: true,
            },
          ],
          editable: Editable.user,
          required: true,
          placeholder: "",
        },
      ];

      const body: UpdateEventTypeInput_2024_04_15 = {
        bookingFields,
      };

      return request(app.getHttpServer())
        .patch(`/api/v2/event-types/${eventType.id}`)
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventType> = response.body;
          const responseBookingFields = eventTypeBookingFields.parse(responseBody.data.bookingFields);
          expect(responseBookingFields).toBeDefined();
          // note(Lauris): response bookingFields are already existing default bookingFields + the new one
          const responseBookingField = responseBookingFields.find((field) => field.name === bookingFieldName);
          const fields = responseBookingField;
          // @ts-expect-error fields is possibly undefined
          delete fields.labelAsSafeHtml;
          expect(fields).toEqual(bookingFields[0]);
          eventType.bookingFields = responseBookingFields;
        });
    });

    it(`/GET/:id`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types/${eventType.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_04_15)
        // note: bearer token value mocked using "withApiAuth" for user which id is used when creating event type above
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

    it(`/GET/:id with version VERSION_2024_06_11`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types/${eventType.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_11)
        // note: bearer token value mocked using "withApiAuth" for user which id is used when creating event type above
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
        .set(CAL_API_VERSION_HEADER, VERSION_2024_04_15)
        // note: bearer token value mocked using "withApiAuth" for user which id is used when creating event type above
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
        .set(CAL_API_VERSION_HEADER, VERSION_2024_04_15)
        // note: bearer token value mocked using "withApiAuth" for user which id is used when creating event type above
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
        .set(CAL_API_VERSION_HEADER, VERSION_2024_04_15)
        // note: bearer token value mocked using "withApiAuth" for user which id is used when creating event type above
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
        .set(CAL_API_VERSION_HEADER, VERSION_2024_04_15)
        // note: bearer token value mocked using "withApiAuth" for user which id is used when creating event type above
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
        .set(CAL_API_VERSION_HEADER, VERSION_2024_04_15)
        // note: bearer token value mocked using "withApiAuth" for user which id is used when creating event type above
        .set("Authorization", `Bearer whatever`)
        .expect(404);
    });

    it("should delete schedule", async () => {
      return request(app.getHttpServer())
        .delete(`/api/v2/event-types/${eventType.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_04_15)
        .expect(200);
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
