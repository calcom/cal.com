import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import {
  expectedSlotsUTC,
  expectedSlotsUTCRange,
} from "@/modules/slots/slots-2024-09-04/controllers/e2e/expected-slots";
import { GetSlotsOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-slots.output";
import { SlotsModule_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_09_04 } from "@calcom/platform-constants";
import type { CreateScheduleInput_2024_06_11 } from "@calcom/platform-types";
import type { User, Booking } from "@calcom/prisma/client";

describe("Slots 2024-09-04 Endpoints", () => {
  describe("rescheduleUid functionality", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let schedulesService: SchedulesService_2024_06_11;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;

    const userEmail = `slots-reschedule-uid-${randomString()}@example.com`;
    const bookedStartTime = "2050-09-05T11:00:00.000Z";
    let user: User;
    let eventTypeId: number;
    let eventTypeSlug: string;
    let existingBooking: Booking;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AppModule,
          PrismaModule,
          UsersModule,
          TokensModule,
          SchedulesModule_2024_06_11,
          SlotsModule_2024_09_04,
        ],
      })
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_06_11>(SchedulesService_2024_06_11);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        name: userEmail,
        username: userEmail,
      });

      const userSchedule: CreateScheduleInput_2024_06_11 = {
        name: `reschedule-uid-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      // note(Lauris): this creates default schedule monday to friday from 9AM to 5PM in Europe/Rome timezone
      await schedulesService.createUserSchedule(user.id, userSchedule);

      const event = await eventTypesRepositoryFixture.create(
        {
          title: "reschedule test meeting",
          slug: `reschedule-uid-event-type-${randomString()}`,
          length: 60,
        },
        user.id
      );
      eventTypeId = event.id;
      eventTypeSlug = event.slug;

      // Create an existing booking that will be used for reschedule testing
      existingBooking = await bookingsRepositoryFixture.create({
        uid: `reschedule-booking-uid-${randomString()}`,
        title: "existing booking for reschedule",
        startTime: bookedStartTime,
        endTime: "2050-09-05T12:00:00.000Z",
        eventType: {
          connect: {
            id: eventTypeId,
          },
        },
        metadata: {},
        responses: {
          name: "reschedule tester",
          email: "reschedule@example.com",
          guests: [],
        },
        user: {
          connect: {
            id: user.id,
          },
        },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    describe("bookingUidToReschedule parameter validation", () => {
      it("should accept bookingUidToReschedule as optional string parameter", async () => {
        const response = await request(app.getHttpServer())
          .get(
            `/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09&bookingUidToReschedule=${existingBooking.uid}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);

        const responseBody: GetSlotsOutput_2024_09_04 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data).toBeDefined();
      });

      it("should accept numeric bookingUidToReschedule parameter and convert to string", async () => {
        const response = await request(app.getHttpServer())
          .get(
            `/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09&bookingUidToReschedule=12345`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);

        // Note: The API accepts numeric bookingUidToReschedule and converts it to string
        // This is expected behavior for query parameters
        const responseBody: GetSlotsOutput_2024_09_04 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
      });

      it("should handle empty bookingUidToReschedule parameter gracefully", async () => {
        const response = await request(app.getHttpServer())
          .get(`/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09&bookingUidToReschedule=`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);

        const responseBody: GetSlotsOutput_2024_09_04 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
      });
    });

    describe("bookingUidToReschedule slot availability behavior", () => {
      it("should exclude booked slot when bookingUidToReschedule is not provided", async () => {
        const response = await request(app.getHttpServer())
          .get(`/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);

        const responseBody: GetSlotsOutput_2024_09_04 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const slots = responseBody.data;

        expect(slots).toBeDefined();
        const days = Object.keys(slots);
        expect(days.length).toEqual(5);

        // Check that the booked slot time is NOT available
        const slotsForBookedDay = slots["2050-09-05"];
        expect(slotsForBookedDay).toBeDefined();

        // Verify the booked slot is excluded
        const bookedSlotExists = slotsForBookedDay.some((slot: any) => slot.start === bookedStartTime);
        expect(bookedSlotExists).toBe(false);

        // Verify we still have slots for that day (just not the booked one)
        expect(slotsForBookedDay.length).toBeGreaterThan(0);
      });

      it("should include booked slot when matching bookingUidToReschedule is provided", async () => {
        const response = await request(app.getHttpServer())
          .get(
            `/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09&bookingUidToReschedule=${existingBooking.uid}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);

        const responseBody: GetSlotsOutput_2024_09_04 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const slots = responseBody.data;

        expect(slots).toBeDefined();
        const days = Object.keys(slots);
        expect(days.length).toEqual(5);

        // Check that the booked slot time IS available when rescheduling
        const slotsForBookedDay = slots["2050-09-05"];
        expect(slotsForBookedDay).toBeDefined();

        // Verify the booked slot is now included due to bookingUidToReschedule
        const bookedSlotExists = slotsForBookedDay.some((slot: any) => slot.start === bookedStartTime);
        expect(bookedSlotExists).toBe(true);
      });

      it("should work with non-existent bookingUidToReschedule without errors", async () => {
        const nonExistentUid = `non-existent-${randomString()}`;
        const response = await request(app.getHttpServer())
          .get(
            `/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09&bookingUidToReschedule=${nonExistentUid}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);

        const responseBody: GetSlotsOutput_2024_09_04 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const slots = responseBody.data;

        expect(slots).toBeDefined();

        // Should behave like normal slots query when bookingUidToReschedule doesn't match any booking
        const slotsForBookedDay = slots["2050-09-05"];
        expect(slotsForBookedDay).toBeDefined();

        // Verify the booked slot is excluded (same as without bookingUidToReschedule)
        const bookedSlotExists = slotsForBookedDay.some((slot: any) => slot.start === bookedStartTime);
        expect(bookedSlotExists).toBe(false);
      });
    });

    describe("bookingUidToReschedule with different query types", () => {
      it("should work with bookingUidToReschedule using event type slug query", async () => {
        const response = await request(app.getHttpServer())
          .get(
            `/v2/slots?eventTypeSlug=${eventTypeSlug}&username=${user.username}&start=2050-09-05&end=2050-09-09&bookingUidToReschedule=${existingBooking.uid}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);

        const responseBody: GetSlotsOutput_2024_09_04 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const slots = responseBody.data;

        expect(slots).toBeDefined();
        expect(slots).toEqual(expectedSlotsUTC);
      });

      it("should work with bookingUidToReschedule in range format", async () => {
        const response = await request(app.getHttpServer())
          .get(
            `/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09&format=range&bookingUidToReschedule=${existingBooking.uid}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);

        const responseBody: GetSlotsOutput_2024_09_04 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const slots = responseBody.data;

        expect(slots).toBeDefined();
        expect(slots).toEqual(expectedSlotsUTCRange);

        // Verify range format structure
        const daySlots = slots["2050-09-05"];
        if (daySlots && daySlots.length > 0) {
          expect(daySlots[0]).toHaveProperty("start");
          expect(daySlots[0]).toHaveProperty("end");
        }
      });

      it("should work with bookingUidToReschedule and timezone parameter", async () => {
        const response = await request(app.getHttpServer())
          .get(
            `/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09&timeZone=Europe/Rome&bookingUidToReschedule=${existingBooking.uid}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);

        const responseBody: GetSlotsOutput_2024_09_04 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const slots = responseBody.data;

        expect(slots).toBeDefined();
        const days = Object.keys(slots);
        expect(days.length).toEqual(5);

        // Verify timezone conversion works with bookingUidToReschedule
        const daySlots = slots["2050-09-05"];
        if (daySlots && daySlots.length > 0) {
          // Should contain timezone info (+02:00 for Europe/Rome)
          expect(daySlots[0].start).toContain("+02:00");

          // Verify rescheduleUid functionality: the booked slot should be available
          const bookedSlotTimeRome = "2050-09-05T13:00:00.000+02:00"; // 11:00 UTC = 13:00 Rome
          const bookedSlotExists = daySlots.some((slot: any) => slot.start === bookedSlotTimeRome);
          expect(bookedSlotExists).toBe(true);
        }
      });
    });

    describe("bookingUidToReschedule edge cases", () => {
      it("should handle bookingUidToReschedule with special characters", async () => {
        const specialUid = `special-uid-${randomString()}-with-dashes`;
        const response = await request(app.getHttpServer())
          .get(
            `/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09&bookingUidToReschedule=${specialUid}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);

        const responseBody: GetSlotsOutput_2024_09_04 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
      });

      it("should handle very long bookingUidToReschedule", async () => {
        const longUid = `very-long-uid-${randomString()}-${"x".repeat(100)}`;
        const response = await request(app.getHttpServer())
          .get(
            `/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09&bookingUidToReschedule=${longUid}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);

        const responseBody: GetSlotsOutput_2024_09_04 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
      });
    });

    afterAll(async () => {
      // Clean up test data
      await bookingsRepositoryFixture.deleteById(existingBooking.id);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await userRepositoryFixture.deleteByEmail(userEmail);
      await app.close();
    });
  });
});
