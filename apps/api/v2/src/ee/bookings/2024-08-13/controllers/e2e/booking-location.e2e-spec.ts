import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
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
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { SchedulesRepositoryFixture } from "test/fixtures/repository/schedules.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import {
  CAL_API_VERSION_HEADER,
  SUCCESS_STATUS,
  VERSION_2024_06_14,
  VERSION_2024_08_13,
} from "@calcom/platform-constants";
import {
  BookingWindowPeriodInputTypeEnum_2024_06_14,
  BookerLayoutsInputEnum_2024_06_14,
  ConfirmationPolicyEnum,
  NoticeThresholdUnitEnum,
  FrequencyInput,
} from "@calcom/platform-enums";
import {
  ApiSuccessResponse,
  BookingOutput_2024_08_13,
  CreateEventTypeInput_2024_06_14,
  CreateRecurringBookingInput_2024_08_13,
  EventTypeOutput_2024_06_14,
  NameFieldInput_2024_06_14,
  UpdateEventTypeInput_2024_06_14,
} from "@calcom/platform-types";
import { SchedulingType } from "@calcom/prisma/enums";

describe("Event types Endpoints", () => {
  describe("User Authenticated", () => {
    let app: INestApplication;

    let oAuthClient: PlatformOAuthClient;
    let organization: Team;
    let userRepositoryFixture: UserRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let schedulesRepostoryFixture: SchedulesRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;

    const suffix = Math.floor(Math.random() * 1000);
    const userEmail = `bob-${suffix}@api.com`;
    const name = `bob-${suffix}`;
    const username = name;

    let user: User;

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
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);

      organization = await teamRepositoryFixture.create({ name: "organization" });
      oAuthClient = await createOAuthClient(organization.id);
      user = await userRepositoryFixture.create({
        email: userEmail,
        name,
        username,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
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

    describe("book an event type with cal video as default location", () => {
      let eventTypeId: number;

      it("should create an event type with cal video as the default location", async () => {
        const body: CreateEventTypeInput_2024_06_14 = {
          title: "Coding class",
          slug: "coding-class-1",
          description: "Let's learn how to code like a pro.",
          lengthInMinutes: 60,
        };

        return request(app.getHttpServer())
          .post("/api/v2/event-types")
          .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
            const createdEventType = responseBody.data;
            expect(createdEventType.locations).toEqual([
              {
                type: "integration",
                integration: "cal-video",
              },
            ]);
            eventTypeId = createdEventType.id;
          });
      });

      it("should book and have video call url as location", async () => {
        const body: CreateRecurringBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 1, 4, 13, 0, 0)).toISOString(),
          eventTypeId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          metadata: {
            userId: "1000",
          },
        };

        return request(app.getHttpServer())
          .post("/api/v2/bookings")
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            const booking = responseBody.data as BookingOutput_2024_08_13;
            expect(booking.location.startsWith("http://")).toBe(true);
            expect(booking.metadata).toEqual(body.metadata);
          });
      });

      it("should book with custom location", async () => {
        const body: CreateRecurringBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 1, 4, 14, 0, 0)).toISOString(),
          eventTypeId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          metadata: {
            userId: "1000",
          },
          location: "via roma 10",
        };

        return request(app.getHttpServer())
          .post("/api/v2/bookings")
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            const booking = responseBody.data as BookingOutput_2024_08_13;
            expect(booking.location).toEqual(body.location);
            expect(booking.meetingUrl).toEqual(body.location);
            expect(booking.metadata).toEqual(body.metadata);
          });
      });

      afterAll(async () => {
        await eventTypesRepositoryFixture.delete(eventTypeId);
        await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      });
    });

    describe("book an event type with cal video as custom location", () => {
      let eventTypeId: number;

      it("should create an event type by specifying location equal to cal video", async () => {
        const body: CreateEventTypeInput_2024_06_14 = {
          title: "Coding class",
          slug: "coding-class-2",
          description: "Let's learn how to code like a pro.",
          lengthInMinutes: 60,
          locations: [
            {
              type: "integration",
              integration: "cal-video",
            },
          ],
        };

        return request(app.getHttpServer())
          .post("/api/v2/event-types")
          .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
            const createdEventType = responseBody.data;
            expect(createdEventType.locations).toEqual(body.locations);
            eventTypeId = createdEventType.id;
          });
      });

      it("should book event type with cal video as custom location", async () => {
        const body: CreateRecurringBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 1, 4, 15, 0, 0)).toISOString(),
          eventTypeId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          metadata: {
            userId: "1000",
          },
        };

        return request(app.getHttpServer())
          .post("/api/v2/bookings")
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            const booking = responseBody.data as BookingOutput_2024_08_13;
            expect(booking.location.startsWith("http://")).toBe(true);
            expect(booking.metadata).toEqual(body.metadata);
          });
      });

      afterAll(async () => {
        await eventTypesRepositoryFixture.delete(eventTypeId);
        await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      });
    });

    describe("book an event type with address location", () => {
      let eventTypeId: number;
      const address = "Via roma 10, Rome, Italy";

      it("should create an event type by specifying location equal to an address", async () => {
        const body: CreateEventTypeInput_2024_06_14 = {
          title: "Coding class",
          slug: "coding-class-2",
          description: "Let's learn how to code like a pro.",
          lengthInMinutes: 60,
          locations: [
            {
              type: "address",
              address,
              public: true,
            },
          ],
        };

        return request(app.getHttpServer())
          .post("/api/v2/event-types")
          .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
            const createdEventType = responseBody.data;
            expect(createdEventType.locations).toEqual(body.locations);
            eventTypeId = createdEventType.id;
          });
      });

      it("should book event type with address", async () => {
        const body: CreateRecurringBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 1, 4, 15, 0, 0)).toISOString(),
          eventTypeId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          metadata: {
            userId: "1000",
          },
        };

        return request(app.getHttpServer())
          .post("/api/v2/bookings")
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            const booking = responseBody.data as BookingOutput_2024_08_13;
            expect(booking.location).toEqual(address);
            expect(booking.metadata).toEqual(body.metadata);
          });
      });

      afterAll(async () => {
        await eventTypesRepositoryFixture.delete(eventTypeId);
        await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      });
    });

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      try {
        await userRepositoryFixture.delete(user.id);
      } catch (e) {
        // User might have been deleted by the test
      }
      await app.close();
    });
  });
});
