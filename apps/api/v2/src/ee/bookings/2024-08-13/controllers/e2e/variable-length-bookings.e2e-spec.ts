import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import type {
  BookingOutput_2024_08_13,
  CreateBookingInput_2024_08_13,
  CreateRecurringBookingInput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
} from "@calcom/platform-types";
import type { EventType, PlatformOAuthClient, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { RescheduleBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/reschedule-booking.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Bookings Endpoints 2024-08-13", () => {
  describe("User bookings", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let teamRepositoryFixture: TeamRepositoryFixture;

    const userEmail = `variable-length-bookings-2024-08-13-user-${randomString()}@api.com`;
    let user: User;

    let variableLengthEventType: EventType;
    const VARIABLE_LENGTH_EVENT_TYPE_SLUG = `variable-length-bookings-2024-08-13-event-type-${randomString()}`;
    let normalEventType: EventType;
    const NORMAL_EVENT_TYPE_SLUG = `variable-length-bookings-2024-08-13-event-type-${randomString()}`;
    let variableLengthRecurringEventType: EventType;
    const VARIABLE_LENGTH_RECURRING_EVENT_TYPE_SLUG = `variable-length-recurring-bookings-2024-08-13-event-type-${randomString()}`;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, SchedulesModule_2024_04_15],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

      organization = await teamRepositoryFixture.create({
        name: `variable-length-bookings-2024-08-13-organization-${randomString()}`,
      });
      oAuthClient = await createOAuthClient(organization.id);

      user = await userRepositoryFixture.create({
        email: userEmail,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `variable-length-bookings-2024-08-13-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);

      variableLengthEventType = await eventTypesRepositoryFixture.create(
        {
          title: `variable-length-bookings-2024-08-13-event-type-${randomString()}`,
          slug: VARIABLE_LENGTH_EVENT_TYPE_SLUG,
          length: 15,
          metadata: { multipleDuration: [15, 30, 60] },
        },
        user.id
      );

      normalEventType = await eventTypesRepositoryFixture.create(
        {
          title: `variable-length-bookings-2024-08-13-event-type-${randomString()}`,
          slug: NORMAL_EVENT_TYPE_SLUG,
          length: 15,
        },
        user.id
      );

      variableLengthRecurringEventType = await eventTypesRepositoryFixture.create(
        {
          title: `variable-length-recurring-bookings-2024-08-13-event-type-${randomString()}`,
          slug: VARIABLE_LENGTH_RECURRING_EVENT_TYPE_SLUG,
          length: 15,
          metadata: { multipleDuration: [15, 30, 60] },
          recurringEvent: { freq: 2, count: 3, interval: 1 }, // Weekly, 3 times, every 1 week
        },
        user.id
      );

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    async function createOAuthClient(organizationId: number) {
      const data = {
        logo: "logo-url",
        name: "name",
        redirectUris: ["http://localhost:5555"],
        permissions: 32,
      };
      const secret = "secret";

      const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
      return client;
    }

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
    });

    describe("create bookings", () => {
      it("should not be able to specify length of booking for non variable length event type", async () => {
        const lengthInMinutes = 30;
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 10, 0, 0)).toISOString(),
          eventTypeId: normalEventType.id,
          lengthInMinutes,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: "https://meet.google.com/abc-def-ghi",
          bookingFieldsResponses: {
            customField: "customValue",
          },
        };

        return request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });

      it("should create a booking with default length", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 10, 0, 0)).toISOString(),
          eventTypeId: variableLengthEventType.id,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: "https://meet.google.com/abc-def-ghi",
          bookingFieldsResponses: {
            customField: "customValue",
          },
        };

        return request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(
                new Date(Date.UTC(2030, 0, 8, 10, variableLengthEventType.length, 0)).toISOString()
              );
              expect(data.duration).toEqual(variableLengthEventType.length);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should create a booking with specified length that is not default length", async () => {
        const lengthInMinutes = 30;
        const body: CreateBookingInput_2024_08_13 = {
          lengthInMinutes,
          start: new Date(Date.UTC(2030, 0, 8, 11, 0, 0)).toISOString(),
          eventTypeId: variableLengthEventType.id,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: "https://meet.google.com/abc-def-ghi",
          bookingFieldsResponses: {
            customField: "customValue",
          },
        };

        return request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 8, 11, lengthInMinutes, 0)).toISOString());
              expect(data.duration).toEqual(lengthInMinutes);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });
    });

    describe("create recurring bookings", () => {
      it("should create recurring bookings with custom lengthInMinutes", async () => {
        const lengthInMinutes = 30;
        const body: CreateRecurringBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 1, 1, 14, 0, 0)).toISOString(),
          eventTypeId: variableLengthRecurringEventType.id,
          lengthInMinutes,
          recurrenceCount: 2,
          attendee: {
            name: "Mr Recurring",
            email: "mr_recurring@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
        };

        return request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201)
          .then(async (response) => {
            const responseBody: { status: string; data: RecurringBookingOutput_2024_08_13[] } = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(Array.isArray(responseBody.data)).toBe(true);
            expect(responseBody.data).toHaveLength(2);

            const firstBooking = responseBody.data[0];
            const secondBooking = responseBody.data[1];
            expect(firstBooking.duration).toEqual(lengthInMinutes);
            expect(secondBooking.duration).toEqual(lengthInMinutes);
          });
      });

      it("should reject recurring booking with invalid lengthInMinutes", async () => {
        const body: CreateRecurringBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 3, 1, 10, 0, 0)).toISOString(),
          eventTypeId: variableLengthRecurringEventType.id,
          lengthInMinutes: 45, // Not in allowed [15, 30, 60]
          recurrenceCount: 2,
          attendee: {
            name: "Mr Invalid",
            email: "mr_invalid@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
        };

        return request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });
    });

    describe("reschedule bookings with non-default duration", () => {
      let bookingWithNonDefaultDuration: BookingOutput_2024_08_13;
      const nonDefaultLengthInMinutes = 30;

      it("should create a booking with non-default duration to be rescheduled", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          lengthInMinutes: nonDefaultLengthInMinutes,
          start: new Date(Date.UTC(2030, 0, 9, 10, 0, 0)).toISOString(),
          eventTypeId: variableLengthEventType.id,
          attendee: {
            name: "Mr Reschedule",
            email: "mr_reschedule@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: "https://meet.google.com/abc-def-ghi",
        };

        return request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              bookingWithNonDefaultDuration = responseBody.data;
              expect(bookingWithNonDefaultDuration.duration).toEqual(nonDefaultLengthInMinutes);
            } else {
              throw new Error("Invalid response data - expected booking");
            }
          });
      });

      it("should reschedule and preserve the original non-default duration", async () => {
        const newStartTime = new Date(Date.UTC(2030, 0, 9, 12, 0, 0)).toISOString();
        const body: RescheduleBookingInput_2024_08_13 = {
          start: newStartTime,
          reschedulingReason: "Testing duration preservation",
        };

        return request(app.getHttpServer())
          .post(`/v2/bookings/${bookingWithNonDefaultDuration.uid}/reschedule`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201)
          .then(async (response) => {
            const responseBody: RescheduleBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();

            const rescheduledBooking = responseBody.data as BookingOutput_2024_08_13;

            // verify the duration is preserved (should be 30 minutes, not the default 15)
            expect(rescheduledBooking.duration).toEqual(nonDefaultLengthInMinutes);
            expect(rescheduledBooking.duration).toEqual(bookingWithNonDefaultDuration.duration);

            // verify the end time is correct (start + 30 minutes)
            const expectedEndTime = new Date(
              Date.UTC(2030, 0, 9, 12, nonDefaultLengthInMinutes, 0)
            ).toISOString();
            expect(rescheduledBooking.start).toEqual(newStartTime);
            expect(rescheduledBooking.end).toEqual(expectedEndTime);

            // verify it's linked to the original booking
            expect(rescheduledBooking.rescheduledFromUid).toEqual(bookingWithNonDefaultDuration.uid);
          });
      });
    });

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(user.email);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await app.close();
    });
  });

  function responseDataIsBooking(data: any): data is BookingOutput_2024_08_13 {
    return !Array.isArray(data) && typeof data === "object" && data && "id" in data;
  }
});
