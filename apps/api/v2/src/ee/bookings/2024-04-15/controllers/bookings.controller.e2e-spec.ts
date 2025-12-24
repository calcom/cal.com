import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateBookingInput_2024_04_15 } from "@/ee/bookings/2024-04-15/inputs/create-booking.input";
import { CreateRecurringBookingInput_2024_04_15 } from "@/ee/bookings/2024-04-15/inputs/create-recurring-booking.input";
import { GetBookingOutput_2024_04_15 } from "@/ee/bookings/2024-04-15/outputs/get-booking.output";
import { GetBookingsOutput_2024_04_15 } from "@/ee/bookings/2024-04-15/outputs/get-bookings.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { BookingResponse } from "@calcom/platform-libraries";
import { type RegularBookingCreateResult } from "@calcom/platform-libraries/bookings";
import type { ApiSuccessResponse, ApiErrorResponse } from "@calcom/platform-types";
import type { User } from "@calcom/prisma/client";

describe("Bookings Endpoints 2024-04-15", () => {
  describe("User Authenticated", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
    let apiKeyString: string;

    const userEmail = `bookings-2024-04-15-user-${randomString()}@api.com`;
    let user: User;

    let eventTypeId: number;
    let recEventTypeId: number;

    let createdBooking: RegularBookingCreateResult;

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
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);
      apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
      user = await userRepositoryFixture.create({
        email: userEmail,
      });

      const { keyString } = await apiKeysRepositoryFixture.createApiKey(user.id, null);
      apiKeyString = keyString;
      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `bookings-2024-04-15-schedule-${randomString()}-${describe.name}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);
      const event = await eventTypesRepositoryFixture.create(
        {
          title: `bookings-2024-04-15-event-type-${randomString()}-${describe.name}`,
          slug: `bookings-2024-04-15-event-type-${randomString()}-${describe.name}`,
          length: 60,
        },
        user.id
      );

      const recEventType = await eventTypesRepositoryFixture.create(
        {
          title: `rec-bookings-2024-04-15-event-type-${randomString()}-${describe.name}`,
          slug: `rec-bookings-2024-04-15-event-type-${randomString()}-${describe.name}`,
          length: 60,
          recurringEvent: { freq: 2, count: 4, interval: 1 },
        },
        user.id
      );
      recEventTypeId = recEventType.id;

      eventTypeId = event.id;

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
    });

    it("should create a booking", async () => {
      const bookingStart = "2040-05-21T09:30:00.000Z";
      const bookingEnd = "2040-05-21T10:30:00.000Z";
      const bookingEventTypeId = eventTypeId;
      const bookingTimeZone = "Europe/London";
      const bookingLanguage = "en";
      const bookingHashedLink = "";
      const bookingMetadata = {
        timeFormat: "12",
        meetingType: "organizer-phone",
      };
      const bookingResponses = {
        name: "tester",
        email: "tester@example.com",
        location: {
          value: "link",
          optionValue: "",
        },
        notes: "test",
      };

      const body: CreateBookingInput_2024_04_15 = {
        start: bookingStart,
        end: bookingEnd,
        eventTypeId: bookingEventTypeId,
        timeZone: bookingTimeZone,
        language: bookingLanguage,
        metadata: bookingMetadata,
        hashedLink: bookingHashedLink,
        responses: bookingResponses,
      };

      return request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<RegularBookingCreateResult> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.userPrimaryEmail).toBeDefined();
          expect(responseBody.data.userPrimaryEmail).toEqual(userEmail);
          expect(responseBody.data.id).toBeDefined();
          expect(responseBody.data.uid).toBeDefined();
          expect(responseBody.data.startTime).toEqual(bookingStart);
          expect(responseBody.data.eventTypeId).toEqual(bookingEventTypeId);
          expect(responseBody.data.user.timeZone).toEqual(bookingTimeZone);
          expect(responseBody.data.metadata).toEqual(bookingMetadata);
          expect(responseBody.data.responses).toEqual(bookingResponses);

          createdBooking = responseBody.data;
        });
    });

    it("should fail to create a booking with no_available_users_found_error", async () => {
      const bookingStart = "2040-05-21T09:30:00.000Z";
      const bookingEnd = "2040-05-21T10:30:00.000Z";
      const bookingEventTypeId = eventTypeId;
      const bookingTimeZone = "Europe/London";
      const bookingLanguage = "en";
      const bookingHashedLink = "";
      const bookingMetadata = {
        timeFormat: "12",
        meetingType: "organizer-phone",
      };
      const bookingResponses = {
        name: "tester",
        email: "tester@example.com",
        location: {
          value: "link",
          optionValue: "",
        },
        notes: "test",
        guests: [],
      };

      const body: CreateBookingInput_2024_04_15 = {
        start: bookingStart,
        end: bookingEnd,
        eventTypeId: bookingEventTypeId,
        timeZone: bookingTimeZone,
        language: bookingLanguage,
        metadata: bookingMetadata,
        hashedLink: bookingHashedLink,
        responses: bookingResponses,
      };

      return request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .expect(400)
        .then(async (response) => {
          const responseBody: ApiErrorResponse = response.body;
          expect(responseBody.error.message).toEqual("no_available_users_found_error");
        });
    });

    it("should create a booking with api key to get owner id", async () => {
      const bookingStart = "2040-05-22T09:30:00.000Z";
      const bookingEnd = "2040-05-22T10:30:00.000Z";
      const bookingEventTypeId = eventTypeId;
      const bookingTimeZone = "Europe/London";
      const bookingLanguage = "en";
      const bookingHashedLink = "";
      const bookingMetadata = {
        timeFormat: "12",
        meetingType: "organizer-phone",
      };
      const bookingResponses = {
        name: "tester",
        email: "tester@example.com",
        location: {
          value: "link",
          optionValue: "",
        },
        notes: "test",
        guests: [],
      };

      const body: CreateBookingInput_2024_04_15 = {
        start: bookingStart,
        end: bookingEnd,
        eventTypeId: bookingEventTypeId,
        timeZone: bookingTimeZone,
        language: bookingLanguage,
        metadata: bookingMetadata,
        hashedLink: bookingHashedLink,
        responses: bookingResponses,
      };

      return request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<RegularBookingCreateResult> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.userPrimaryEmail).toBeDefined();
          expect(responseBody.data.userPrimaryEmail).toEqual(userEmail);
          expect(responseBody.data.id).toBeDefined();
          expect(responseBody.data.uid).toBeDefined();
          expect(responseBody.data.startTime).toEqual(bookingStart);
          expect(responseBody.data.eventTypeId).toEqual(bookingEventTypeId);
          expect(responseBody.data.user.timeZone).toEqual(bookingTimeZone);
          expect(responseBody.data.metadata).toEqual(bookingMetadata);
          expect(responseBody.data.responses).toEqual(bookingResponses);

          createdBooking = responseBody.data;
        });
    });

    describe("should reschedule a booking", () => {
      it("should reschedule with updated start time, end time & metadata", async () => {
        const newBookingStart = "2040-05-21T12:30:00.000Z";
        const newBookingEnd = "2040-05-21T13:30:00.000Z";
        const bookingEventTypeId = eventTypeId;
        const bookingTimeZone = "Europe/London";
        const bookingLanguage = "en";
        const bookingHashedLink = "";
        const newBookingMetadata = {
          timeFormat: "24",
          meetingType: "attendee-phone",
        };
        const bookingResponses = {
          name: "tester",
          email: "tester@example.com",
          location: {
            value: "link",
            optionValue: "",
          },
          notes: "test",
          guests: ["someone@example.com"],
        };

        const body: CreateBookingInput_2024_04_15 = {
          rescheduleUid: createdBooking.uid,
          start: newBookingStart,
          end: newBookingEnd,
          eventTypeId: bookingEventTypeId,
          timeZone: bookingTimeZone,
          language: bookingLanguage,
          metadata: newBookingMetadata,
          hashedLink: bookingHashedLink,
          responses: bookingResponses,
        };

        return request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: ApiSuccessResponse<RegularBookingCreateResult> = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.userPrimaryEmail).toBeDefined();
            expect(responseBody.data.userPrimaryEmail).toEqual(userEmail);
            expect(responseBody.data.id).toBeDefined();
            expect(responseBody.data.uid).toBeDefined();
            expect(responseBody.data.startTime).toEqual(newBookingStart);
            expect(responseBody.data.eventTypeId).toEqual(bookingEventTypeId);
            expect(responseBody.data.user.timeZone).toEqual(bookingTimeZone);
            expect(responseBody.data.metadata).toEqual(newBookingMetadata);
            expect(responseBody.data.responses).toEqual(bookingResponses);

            createdBooking = responseBody.data;
          });
      });
    });

    it("should get bookings", async () => {
      return request(app.getHttpServer())
        .get("/v2/bookings?filters[status]=upcoming")
        .then((response) => {
          const responseBody: GetBookingsOutput_2024_04_15 = response.body;

          expect(responseBody.data.bookings.length).toEqual(2);
          const fetchedBooking = responseBody.data.bookings.find(
            (booking) => booking.id === createdBooking.id
          );
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(fetchedBooking).toBeDefined();

          if (fetchedBooking) {
            expect(fetchedBooking.id).toEqual(createdBooking.id);
            expect(fetchedBooking.uid).toEqual(createdBooking.uid);
            expect(fetchedBooking.startTime).toEqual(createdBooking.startTime);
            expect(fetchedBooking.endTime).toEqual(createdBooking.endTime);
            expect(fetchedBooking.user?.email).toEqual(userEmail);
          }
        });
    });

    it("should get booking", async () => {
      return request(app.getHttpServer())
        .get(`/v2/bookings/${createdBooking.uid}`)
        .then((response) => {
          const responseBody: GetBookingOutput_2024_04_15 = response.body;
          const bookingInfo = responseBody.data;

          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(bookingInfo?.id).toBeDefined();
          expect(bookingInfo?.uid).toBeDefined();
          expect(bookingInfo?.id).toEqual(createdBooking.id);
          expect(bookingInfo?.uid).toEqual(createdBooking.uid);
          expect(bookingInfo?.eventTypeId).toEqual(createdBooking.eventTypeId);
          expect(bookingInfo?.startTime).toEqual(createdBooking.startTime);
        });
    });

    it("should create a booking with split name", async () => {
      const bookingStart = "2040-05-21T11:30:00.000Z";
      const bookingEnd = "2040-05-21T12:30:00.000Z";
      const bookingEventTypeId = eventTypeId;
      const bookingTimeZone = "Europe/London";
      const bookingLanguage = "en";
      const bookingHashedLink = "";
      const bookingMetadata = {
        timeFormat: "12",
        meetingType: "organizer-phone",
      };
      const bookingResponses = {
        name: { firstName: "John", lastName: "Doe" },
        email: "tester@example.com",
        location: {
          value: "link",
          optionValue: "",
        },
        notes: "test",
      };

      const body: CreateBookingInput_2024_04_15 = {
        start: bookingStart,
        end: bookingEnd,
        eventTypeId: bookingEventTypeId,
        timeZone: bookingTimeZone,
        language: bookingLanguage,
        metadata: bookingMetadata,
        hashedLink: bookingHashedLink,
        responses: bookingResponses,
      };

      return request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<RegularBookingCreateResult> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.userPrimaryEmail).toBeDefined();
          expect(responseBody.data.userPrimaryEmail).toEqual(userEmail);
          expect(responseBody.data.id).toBeDefined();
          expect(responseBody.data.uid).toBeDefined();
          expect(responseBody.data.startTime).toEqual(bookingStart);
          expect(responseBody.data.eventTypeId).toEqual(bookingEventTypeId);
          expect(responseBody.data.user.timeZone).toEqual(bookingTimeZone);
          expect(responseBody.data.metadata).toEqual(bookingMetadata);
          expect(responseBody.data.responses).toEqual({
            ...bookingResponses,
            name: `${bookingResponses.name.firstName} ${bookingResponses.name.lastName}`,
          });

          createdBooking = responseBody.data;
        });
    });

    it("should create recurring bookings", async () => {
      const bookingEventTypeId = recEventTypeId;
      const bookingTimeZone = "Europe/London";
      const bookingLanguage = "en";
      const bookingHashedLink = "";
      const bookingMetadata = {
        timeFormat: "12",
        meetingType: "organizer-phone",
      };
      const bookingResponses = {
        name: "tester",
        email: "tester@example.com",
        location: {
          value: "link",
          optionValue: "",
        },
        notes: "test",
      };

      const body: CreateRecurringBookingInput_2024_04_15[] = [
        {
          start: "2040-06-21T09:30:00.000Z",
          end: "2040-06-21T10:30:00.000Z",
          eventTypeId: bookingEventTypeId,
          timeZone: bookingTimeZone,
          language: bookingLanguage,
          metadata: bookingMetadata,
          hashedLink: bookingHashedLink,
          responses: bookingResponses,
          recurringEventId: "test-recurring-event-id",
        },
        {
          start: "2040-06-27T09:30:00.000Z",
          end: "2040-06-27T10:30:00.000Z",
          eventTypeId: bookingEventTypeId,
          timeZone: bookingTimeZone,
          language: bookingLanguage,
          metadata: bookingMetadata,
          hashedLink: bookingHashedLink,
          responses: bookingResponses,
          recurringEventId: "test-recurring-event-id-2",
        },
        {
          start: "2040-06-04T09:30:00.000Z",
          end: "2040-06-04T10:30:00.000Z",
          eventTypeId: bookingEventTypeId,
          timeZone: bookingTimeZone,
          language: bookingLanguage,
          metadata: bookingMetadata,
          hashedLink: bookingHashedLink,
          responses: bookingResponses,
          recurringEventId: "test-recurring-event-id-3",
        },
        {
          start: "2040-06-11T09:30:00.000Z",
          end: "2040-06-11T10:30:00.000Z",
          eventTypeId: bookingEventTypeId,
          timeZone: bookingTimeZone,
          language: bookingLanguage,
          metadata: bookingMetadata,
          hashedLink: bookingHashedLink,
          responses: bookingResponses,
          recurringEventId: "test-recurring-event-id-4",
        },
      ];

      return request(app.getHttpServer())
        .post("/v2/bookings/recurring")
        .send(body)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<BookingResponse[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          responseBody.data.forEach((booking) => {
            expect(booking.userPrimaryEmail).toBeDefined();
            expect(booking.userPrimaryEmail).toEqual(userEmail);
            expect(booking.id).toBeDefined();
            expect(booking.uid).toBeDefined();
            expect(booking.eventTypeId).toEqual(bookingEventTypeId);
            expect(booking.user.timeZone).toEqual(bookingTimeZone);
            expect(booking.metadata).toEqual(bookingMetadata);
            expect(booking.responses).toEqual(bookingResponses);
            expect(booking.creationSource).toEqual("API_V2");
          });
        });
    });

    describe("event type booking requires authentication", () => {
      let eventTypeRequiringAuthenticationId: number;
      let unauthorizedUser: User;
      let unauthorizedUserApiKeyString: string;

      beforeAll(async () => {
        const eventTypeRequiringAuthentication = await eventTypesRepositoryFixture.create(
          {
            title: `event-type-requiring-authentication-${randomString()}`,
            slug: `event-type-requiring-authentication-${randomString()}`,
            length: 60,
            requiresConfirmation: true,
            bookingRequiresAuthentication: true,
          },
          user.id
        );
        eventTypeRequiringAuthenticationId = eventTypeRequiringAuthentication.id;

        const unauthorizedUserEmail = `unauthorized-user-${randomString()}@api.com`;
        unauthorizedUser = await userRepositoryFixture.create({
          email: unauthorizedUserEmail,
        });
        const { keyString } = await apiKeysRepositoryFixture.createApiKey(unauthorizedUser.id, null);
        unauthorizedUserApiKeyString = keyString;
      });

      afterAll(async () => {
        if (unauthorizedUser) {
          await userRepositoryFixture.deleteByEmail(unauthorizedUser.email);
        }
      });

      it("can't be booked without credentials", async () => {
        const body: CreateBookingInput_2024_04_15 = {
          start: "2040-05-23T09:30:00.000Z",
          end: "2040-05-23T10:30:00.000Z",
          eventTypeId: eventTypeRequiringAuthenticationId,
          timeZone: "Europe/London",
          language: "en",
          metadata: {},
          hashedLink: "",
          responses: {
            name: "External Attendee",
            email: "external@example.com",
            location: {
              value: "link",
              optionValue: "",
            },
          },
        };

        await request(app.getHttpServer()).post("/v2/bookings").send(body).expect(401);
      });

      it("can't be booked with unauthorized user credentials", async () => {
        const body: CreateBookingInput_2024_04_15 = {
          start: "2040-05-23T10:30:00.000Z",
          end: "2040-05-23T11:30:00.000Z",
          eventTypeId: eventTypeRequiringAuthenticationId,
          timeZone: "Europe/London",
          language: "en",
          metadata: {},
          hashedLink: "",
          responses: {
            name: "External Attendee",
            email: "external@example.com",
            location: {
              value: "link",
              optionValue: "",
            },
          },
        };

        await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set({ Authorization: `Bearer cal_test_${unauthorizedUserApiKeyString}` })
          .expect(403);
      });

      it("can be booked with event type owner credentials", async () => {
        const body: CreateBookingInput_2024_04_15 = {
          start: "2040-05-23T11:30:00.000Z",
          end: "2040-05-23T12:30:00.000Z",
          eventTypeId: eventTypeRequiringAuthenticationId,
          timeZone: "Europe/London",
          language: "en",
          metadata: {},
          hashedLink: "",
          responses: {
            name: "External Attendee",
            email: "external@example.com",
            location: {
              value: "link",
              optionValue: "",
            },
          },
        };

        const response = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
          .expect(201);

        const responseBody: ApiSuccessResponse<RegularBookingCreateResult> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data).toBeDefined();
        expect(responseBody.data.id).toBeDefined();

        if (responseBody.data.id) {
          await bookingsRepositoryFixture.deleteById(responseBody.data.id);
        }
      });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await app.close();
    });
  });
});
