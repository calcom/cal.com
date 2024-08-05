import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { GetBookingOutput } from "@/ee/bookings/outputs/get-booking.output";
import { GetBookingsOutput } from "@/ee/bookings/outputs/get-bookings.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import { handleNewBooking } from "@calcom/platform-libraries-0.0.22";
import { ApiSuccessResponse, ApiResponse } from "@calcom/platform-types";

describe("Bookings Endpoints", () => {
  describe("User Authenticated", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;

    const userEmail = "bookings-controller-e2e@api.com";
    let user: User;

    let eventTypeId: number;

    let createdBooking: Awaited<ReturnType<typeof handleNewBooking>>;

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

      user = await userRepositoryFixture.create({
        email: userEmail,
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: "working time",
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);
      const event = await eventTypesRepositoryFixture.create(
        { title: "peer coding", slug: "peer-coding", length: 60 },
        user.id
      );
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
      const bookingMetadata = {};
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

      const body = {
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
          const responseBody: ApiSuccessResponse<Awaited<ReturnType<typeof handleNewBooking>>> =
            response.body;
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

          createdBooking = responseBody.data;
        });
    });

    it("should get bookings", async () => {
      return request(app.getHttpServer())
        .get("/v2/bookings?filters[status]=upcoming")
        .then((response) => {
          const responseBody: GetBookingsOutput = response.body;
          const fetchedBooking = responseBody.data.bookings[0];

          expect(responseBody.data.bookings.length).toEqual(1);
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(fetchedBooking).toBeDefined();

          expect(fetchedBooking.id).toEqual(createdBooking.id);
          expect(fetchedBooking.uid).toEqual(createdBooking.uid);
          expect(fetchedBooking.startTime).toEqual(createdBooking.startTime);
          expect(fetchedBooking.endTime).toEqual(createdBooking.endTime);
          expect(fetchedBooking.user?.email).toEqual(userEmail);
        });
    });

    it("should get booking", async () => {
      return request(app.getHttpServer())
        .get(`/v2/bookings/${createdBooking.uid}`)
        .then((response) => {
          const responseBody: GetBookingOutput = response.body;
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

    // note(Lauris) : found this test broken here - first thing to fix is that recurring endpoint accepts an array not 1 object.
    // it("should create a recurring booking", async () => {
    //   const bookingStart = "2040-05-25T09:30:00.000Z";
    //   const bookingEnd = "2040-05-25T10:30:00.000Z";
    //   const bookingEventTypeId = 7;
    //   const bookingTimeZone = "Europe/London";
    //   const bookingLanguage = "en";
    //   const bookingHashedLink = "";
    //   const bookingRecurringCount = 5;
    //   const currentBookingRecurringIndex = 0;

    //   const body = {
    //     start: bookingStart,
    //     end: bookingEnd,
    //     eventTypeId: bookingEventTypeId,
    //     timeZone: bookingTimeZone,
    //     language: bookingLanguage,
    //     metadata: {},
    //     hashedLink: bookingHashedLink,
    //     recurringCount: bookingRecurringCount,
    //     currentRecurringIndex: currentBookingRecurringIndex,
    //   };

    //   return request(app.getHttpServer())
    //     .post("/v2/bookings/recurring")
    //     .send(body)
    //     .expect(201)
    //     .then((response) => {
    //       const responseBody: ApiResponse<Awaited<ReturnType<typeof handleNewRecurringBooking>>> =
    //         response.body;

    //       expect(responseBody.status).toEqual("recurring");
    //     });
    // });

    // note(Lauris) : found this test broken here - first thing to fix is that the eventTypeId must be team event type, because
    // instant bookings only work for teams.
    // it("should create an instant booking", async () => {
    //   const bookingStart = "2040-05-25T09:30:00.000Z";
    //   const bookingEnd = "2040-25T10:30:00.000Z";
    //   const bookingEventTypeId = 7;
    //   const bookingTimeZone = "Europe/London";
    //   const bookingLanguage = "en";
    //   const bookingHashedLink = "";

    //   const body = {
    //     start: bookingStart,
    //     end: bookingEnd,
    //     eventTypeId: bookingEventTypeId,
    //     timeZone: bookingTimeZone,
    //     language: bookingLanguage,
    //     metadata: {},
    //     hashedLink: bookingHashedLink,
    //   };

    //   return request(app.getHttpServer())
    //     .post("/v2/bookings/instant")
    //     .send(body)
    //     .expect(201)
    //     .then((response) => {
    //       const responseBody: ApiResponse<Awaited<ReturnType<typeof handleInstantMeeting>>> = response.body;

    //       expect(responseBody.status).toEqual("instant");
    //     });
    // });

    // cancelling a booking hangs the test for some reason
    it.skip("should cancel a booking", async () => {
      const bookingId = createdBooking.id;

      const body = {
        allRemainingBookings: false,
        cancellationReason: "Was fighting some unforseen rescheduling demons",
      };

      return request(app.getHttpServer())
        .post(`/v2/bookings/${bookingId}/cancel`)
        .send(body)
        .expect(201)
        .then((response) => {
          const responseBody: ApiResponse<{ status: typeof SUCCESS_STATUS | typeof ERROR_STATUS }> =
            response.body;

          expect(bookingId).toBeDefined();
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
        });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await app.close();
    });
  });
});
