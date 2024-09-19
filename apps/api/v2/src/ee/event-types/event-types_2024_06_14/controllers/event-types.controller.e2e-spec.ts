import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateEventTypeInput_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/inputs/create-event-type.input";
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
import { BookingWindowPeriodInputTypeEnum_2024_06_14, FrequencyInput } from "@calcom/platform-enums";
import {
  ApiSuccessResponse,
  CreateEventTypeInput_2024_06_14,
  EventTypeOutput_2024_06_14,
  UpdateEventTypeInput_2024_06_14,
} from "@calcom/platform-types";
import { SchedulingType } from "@calcom/prisma/enums";

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
        bookingLimitsCount: {
          day: 2,
          week: 5,
        },
        onlyShowFirstAvailableSlot: true,
        bookingLimitsDuration: {
          day: 60,
          week: 100,
        },
        offsetStart: 30,
        bookingWindow: {
          type: BookingWindowPeriodInputTypeEnum_2024_06_14.calendarDays,
          value: 30,
          rolling: true,
        },
        recurrence: {
          frequency: FrequencyInput.weekly,
          interval: 2,
          occurrences: 10,
        },
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
          expect(createdEventType.ownerId).toEqual(user.id);
          expect(createdEventType.scheduleId).toEqual(firstSchedule.id);
          expect(createdEventType.bookingLimitsCount).toEqual(body.bookingLimitsCount);
          expect(createdEventType.onlyShowFirstAvailableSlot).toEqual(body.onlyShowFirstAvailableSlot);
          expect(createdEventType.bookingLimitsDuration).toEqual(body.bookingLimitsDuration);
          expect(createdEventType.offsetStart).toEqual(body.offsetStart);
          expect(createdEventType.bookingWindow).toEqual(body.bookingWindow);
          expect(createdEventType.recurrence).toEqual(body.recurrence);

          const responseBookingFields = body.bookingFields || [];
          const expectedBookingFields = [
            { isDefault: true, required: true, slug: "name", type: "name" },
            { isDefault: true, required: true, slug: "email", type: "email" },
            { isDefault: true, required: false, slug: "rescheduleReason", type: "textarea" },
            ...responseBookingFields.map((field) => ({ isDefault: false, ...field })),
          ];

          expect(createdEventType.bookingFields).toEqual(expectedBookingFields);
          eventType = responseBody.data;
        });
    });

    it("should update event type", async () => {
      const newTitle = "Coding class in Italian!";

      const body: UpdateEventTypeInput_2024_06_14 = {
        title: newTitle,
        scheduleId: secondSchedule.id,
        bookingLimitsCount: {
          day: 4,
          week: 10,
        },
        onlyShowFirstAvailableSlot: true,
        bookingLimitsDuration: {
          day: 100,
          week: 200,
        },
        offsetStart: 50,
        bookingWindow: {
          type: BookingWindowPeriodInputTypeEnum_2024_06_14.businessDays,
          value: 40,
          rolling: false,
        },
        recurrence: {
          frequency: FrequencyInput.monthly,
          interval: 4,
          occurrences: 10,
        },
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
          expect(updatedEventType.bookingLimitsCount).toEqual(body.bookingLimitsCount);
          expect(updatedEventType.onlyShowFirstAvailableSlot).toEqual(body.onlyShowFirstAvailableSlot);
          expect(updatedEventType.bookingLimitsDuration).toEqual(body.bookingLimitsDuration);
          expect(updatedEventType.offsetStart).toEqual(body.offsetStart);
          expect(updatedEventType.bookingWindow).toEqual(body.bookingWindow);
          expect(updatedEventType.recurrence).toEqual(body.recurrence);

          eventType.title = newTitle;
          eventType.scheduleId = secondSchedule.id;
          eventType.bookingLimitsCount = updatedEventType.bookingLimitsCount;
          eventType.onlyShowFirstAvailableSlot = updatedEventType.onlyShowFirstAvailableSlot;
          eventType.bookingLimitsDuration = updatedEventType.bookingLimitsDuration;
          eventType.offsetStart = updatedEventType.offsetStart;
          eventType.bookingWindow = updatedEventType.bookingWindow;
          eventType.recurrence = updatedEventType.recurrence;
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
      expect(fetchedEventType.bookingLimitsCount).toEqual(eventType.bookingLimitsCount);
      expect(fetchedEventType.onlyShowFirstAvailableSlot).toEqual(eventType.onlyShowFirstAvailableSlot);
      expect(fetchedEventType.bookingLimitsDuration).toEqual(eventType.bookingLimitsDuration);
      expect(fetchedEventType.offsetStart).toEqual(eventType.offsetStart);
      expect(fetchedEventType.bookingWindow).toEqual(eventType.bookingWindow);
      expect(fetchedEventType.recurrence).toEqual(eventType.recurrence);
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
      expect(fetchedEventType.bookingLimitsCount).toEqual(eventType.bookingLimitsCount);
      expect(fetchedEventType.onlyShowFirstAvailableSlot).toEqual(eventType.onlyShowFirstAvailableSlot);
      expect(fetchedEventType.bookingLimitsDuration).toEqual(eventType.bookingLimitsDuration);
      expect(fetchedEventType.offsetStart).toEqual(eventType.offsetStart);
      expect(fetchedEventType.bookingWindow).toEqual(eventType.bookingWindow);
      expect(fetchedEventType.recurrence).toEqual(eventType.recurrence);
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
      expect(fetchedEventType.bookingLimitsCount).toEqual(eventType.bookingLimitsCount);
      expect(fetchedEventType.onlyShowFirstAvailableSlot).toEqual(eventType.onlyShowFirstAvailableSlot);
      expect(fetchedEventType.bookingLimitsDuration).toEqual(eventType.bookingLimitsDuration);
      expect(fetchedEventType.offsetStart).toEqual(eventType.offsetStart);
      expect(fetchedEventType.bookingWindow).toEqual(eventType.bookingWindow);
      expect(fetchedEventType.recurrence).toEqual(eventType.recurrence);
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

  describe("Handle legacy event-types booking fields", () => {
    let app: INestApplication;

    let oAuthClient: PlatformOAuthClient;
    let organization: Team;
    let userRepositoryFixture: UserRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;

    const userEmail = "legacy-event-types-test-e2e@api.com";
    const name = "bob-the-builder";
    const username = name;
    let user: User;
    let legacyEventTypeId1: number;
    let legacyEventTypeId2: number;

    const expectedReturnSystemFields = [
      { isDefault: true, required: true, slug: "name", type: "name" },
      { isDefault: true, required: true, slug: "email", type: "email" },
      { isDefault: true, type: "radioInput", slug: "location", required: false },
      { isDefault: true, required: true, slug: "title", type: "text" },
      { isDefault: true, required: false, slug: "notes", type: "textarea" },
      { isDefault: true, required: false, slug: "guests", type: "multiemail" },
      { isDefault: true, required: false, slug: "rescheduleReason", type: "textarea" },
    ];

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

    it("should not allow creating an event type with input of event-types version 2024_04_15", async () => {
      const body: CreateEventTypeInput_2024_04_15 = {
        title: "Coding class",
        slug: "coding-class",
        description: "Let's learn how to code like a pro.",
        length: 60,
        locations: [{ type: "integrations:daily" }],
      };

      return request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send(body)
        .expect(400);
    });

    it("should return system bookingFields stored in database", async () => {
      const legacyEventTypeInput = {
        title: "legacy event type",
        description: "legacy event type description",
        length: 40,
        hidden: false,
        slug: "legacy-event-type",
        locations: [],
        schedulingType: SchedulingType.ROUND_ROBIN,
        bookingFields: [
          {
            name: "name",
            type: "name",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system",
            required: true,
            defaultLabel: "your_name",
          },
          {
            name: "email",
            type: "email",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system",
            required: true,
            defaultLabel: "email_address",
          },
          {
            name: "location",
            type: "radioInput",
            label: "",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system",
            required: false,
            placeholder: "",
            defaultLabel: "location",
            getOptionsAt: "locations",
            optionsInputs: {
              phone: { type: "phone", required: true, placeholder: "" },
              attendeeInPerson: { type: "address", required: true, placeholder: "" },
            },
            hideWhenJustOneOption: true,
          },
          {
            name: "title",
            type: "text",
            hidden: true,
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: true,
            defaultLabel: "what_is_this_meeting_about",
            defaultPlaceholder: "",
          },
          {
            name: "notes",
            type: "textarea",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "additional_notes",
            defaultPlaceholder: "share_additional_notes",
          },
          {
            name: "guests",
            type: "multiemail",
            hidden: false,
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "additional_guests",
            defaultPlaceholder: "email",
          },
          {
            name: "rescheduleReason",
            type: "textarea",
            views: [{ id: "reschedule", label: "Reschedule View" }],
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "reason_for_reschedule",
            defaultPlaceholder: "reschedule_placeholder",
          },
        ],
      };
      const legacyEventType = await eventTypesRepositoryFixture.create(legacyEventTypeInput, user.id);
      legacyEventTypeId1 = legacyEventType.id;

      return request(app.getHttpServer())
        .get(`/api/v2/event-types/${legacyEventTypeId1}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
          const fetchedEventType = responseBody.data;
          expect(fetchedEventType.bookingFields).toEqual(expectedReturnSystemFields);
        });
    });

    it("should return user created bookingFields with system fields", async () => {
      const userDefinedBookingField = {
        name: "team",
        type: "textarea",
        label: "your team",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        placeholder: "FC Barcelona",
      };

      const legacyEventTypeInput = {
        title: "legacy event type two",
        description: "legacy event type description two",
        length: 40,
        hidden: false,
        slug: "legacy-event-type-two",
        locations: [],
        schedulingType: SchedulingType.ROUND_ROBIN,
        bookingFields: [
          userDefinedBookingField,
          {
            name: "name",
            type: "name",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system",
            required: true,
            defaultLabel: "your_name",
          },
          {
            name: "email",
            type: "email",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system",
            required: true,
            defaultLabel: "email_address",
          },
          {
            name: "location",
            type: "radioInput",
            label: "",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system",
            required: false,
            placeholder: "",
            defaultLabel: "location",
            getOptionsAt: "locations",
            optionsInputs: {
              phone: { type: "phone", required: true, placeholder: "" },
              attendeeInPerson: { type: "address", required: true, placeholder: "" },
            },
            hideWhenJustOneOption: true,
          },
          {
            name: "title",
            type: "text",
            hidden: true,
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: true,
            defaultLabel: "what_is_this_meeting_about",
            defaultPlaceholder: "",
          },
          {
            name: "notes",
            type: "textarea",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "additional_notes",
            defaultPlaceholder: "share_additional_notes",
          },
          {
            name: "guests",
            type: "multiemail",
            hidden: false,
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "additional_guests",
            defaultPlaceholder: "email",
          },
          {
            name: "rescheduleReason",
            type: "textarea",
            views: [{ id: "reschedule", label: "Reschedule View" }],
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "reason_for_reschedule",
            defaultPlaceholder: "reschedule_placeholder",
          },
        ],
      };
      const legacyEventType = await eventTypesRepositoryFixture.create(legacyEventTypeInput, user.id);
      legacyEventTypeId2 = legacyEventType.id;

      return request(app.getHttpServer())
        .get(`/api/v2/event-types/${legacyEventTypeId2}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
          const fetchedEventType = responseBody.data;

          expect(fetchedEventType.bookingFields).toEqual([
            ...expectedReturnSystemFields,
            {
              isDefault: false,
              type: userDefinedBookingField.type,
              slug: userDefinedBookingField.name,
              label: userDefinedBookingField.label,
              required: userDefinedBookingField.required,
              placeholder: userDefinedBookingField.placeholder,
            },
          ]);
        });
    });

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      try {
        await eventTypesRepositoryFixture.delete(legacyEventTypeId1);
        await eventTypesRepositoryFixture.delete(legacyEventTypeId2);
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
