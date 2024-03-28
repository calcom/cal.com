import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { SchedulesRepository } from "@/ee/schedules/schedules.repository";
import { SchedulesService } from "@/ee/schedules/services/schedules.service";
import { AvailabilitiesModule } from "@/modules/availabilities/availabilities.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withAccessTokenAuth } from "test/utils/withAccessTokenAuth";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";
import {
  getAllUserBookings,
  handleNewBooking,
  getBookingInfo,
  handleNewRecurringBooking,
  handleInstantMeeting,
} from "@calcom/platform-libraries";
import { ApiSuccessResponse, ApiResponse } from "@calcom/platform-types";

describe("Bookings Endpoints", () => {
  describe("User Authenticated", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;

    const userEmail = "bookings-controller-e2e@api.com";
    let user: User;

    let createdBooking: Awaited<ReturnType<typeof handleNewBooking>>;

    beforeAll(async () => {
      const moduleRef = await withAccessTokenAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, AvailabilitiesModule, UsersModule],
          providers: [SchedulesRepository, SchedulesService],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
    });

    it("should create a booking", async () => {
      const bookingStart = "2023-05-25T09:30:00.000Z";
      const bookingEnd = "2023-05-25T10:30:00.000Z";
      const bookingEventTypeId = 7;
      const bookingTimeZone = "Europe/Londom";
      const bookingLanguage = "en";
      const bookingHashedLink = "";
      const bookingMetadata = {};

      const body = {
        start: bookingStart,
        end: bookingEnd,
        eventTypeId: bookingEventTypeId,
        timeZone: bookingTimeZone,
        language: bookingLanguage,
        metadata: bookingMetadata,
        hashedLink: bookingHashedLink,
      };

      return request(app.getHttpServer())
        .post("/api/v2/ee/bookings")
        .send(body)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<Awaited<ReturnType<typeof handleNewBooking>>> =
            response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.user.email).toBeDefined();
          expect(responseBody.data.user.email).toEqual(userEmail);
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
        .get("/api/v2/ee/bookings")
        .then((response) => {
          const responseBody: ApiSuccessResponse<Awaited<ReturnType<typeof getAllUserBookings>>> =
            response.body;
          const fetchedBooking = responseBody.data.bookings[0];

          expect(responseBody.data.bookings.length).toEqual(1);
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(fetchedBooking).toBeDefined();

          expect(fetchedBooking.id).toEqual(createdBooking.id);
          expect(fetchedBooking.uid).toEqual(createdBooking.uid);
          expect(fetchedBooking.startTime).toEqual(createdBooking.startTime);
          expect(fetchedBooking.endTime).toEqual(createdBooking.endTime);
          expect(fetchedBooking.user?.email).toEqual(createdBooking.user.email);
        });
    });

    it("should get booking", async () => {
      return request(app.getHttpServer())
        .get(`/api/v2/ee/bookings/${createdBooking.uid}`)
        .then((response) => {
          const responseBody: ApiSuccessResponse<Awaited<ReturnType<typeof getBookingInfo>>> = response.body;
          const { bookingInfo } = responseBody.data;

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

    it("should create a recurring booking", async () => {
      const bookingStart = "2023-05-25T09:30:00.000Z";
      const bookingEnd = "2023-05-25T10:30:00.000Z";
      const bookingEventTypeId = 7;
      const bookingTimeZone = "Europe/Londom";
      const bookingLanguage = "en";
      const bookingHashedLink = "";
      const bookingRecurringCount = 5;
      const currentBookingRecurringIndex = 0;

      const body = {
        start: bookingStart,
        end: bookingEnd,
        eventTypeId: bookingEventTypeId,
        timeZone: bookingTimeZone,
        language: bookingLanguage,
        metadata: {},
        hashedLink: bookingHashedLink,
        recurringCount: bookingRecurringCount,
        currentRecurringIndex: currentBookingRecurringIndex,
      };

      return request(app.getHttpServer())
        .post("/api/v2/ee/bookings/reccuring")
        .send(body)
        .expect(201)
        .then((response) => {
          const responseBody: ApiResponse<Awaited<ReturnType<typeof handleNewRecurringBooking>>> =
            response.body;

          expect(responseBody.status).toEqual("recurring");
        });
    });

    it("should create an instant booking", async () => {
      const bookingStart = "2023-05-25T09:30:00.000Z";
      const bookingEnd = "2023-05-25T10:30:00.000Z";
      const bookingEventTypeId = 7;
      const bookingTimeZone = "Europe/Londom";
      const bookingLanguage = "en";
      const bookingHashedLink = "";

      const body = {
        start: bookingStart,
        end: bookingEnd,
        eventTypeId: bookingEventTypeId,
        timeZone: bookingTimeZone,
        language: bookingLanguage,
        metadata: {},
        hashedLink: bookingHashedLink,
      };

      return request(app.getHttpServer())
        .post("/api/v2/ee/bookings/instant")
        .send(body)
        .expect(201)
        .then((response) => {
          const responseBody: ApiResponse<Awaited<ReturnType<typeof handleInstantMeeting>>> = response.body;

          expect(responseBody.status).toEqual("instant");
        });
    });

    it("should cancel a booking", async () => {
      const bookingId = createdBooking.id;

      const body = {
        allRemainingBookings: false,
        cancellationReason: "Was fighting some unforseen rescheduling demons",
      };

      return request(app.getHttpServer())
        .post(`/api/v2/ee/bookings/${bookingId}/cancel`)
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
