import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { RescheduleBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/reschedule-booking.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { DateTime } from "luxon";
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { SelectedSlotRepositoryFixture } from "test/fixtures/repository/selected-slot.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import { RESERVED_SLOT_UID_COOKIE_NAME } from "@calcom/platform-libraries/slots";
import type {
  CreateBookingInput_2024_08_13,
  BookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
} from "@calcom/platform-types";
import type { User, SelectedSlots } from "@calcom/prisma/client";

describe("Reserved Slot Bookings Endpoints 2024-08-13", () => {
  describe("reservedSlotUid functionality", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let selectedSlotRepositoryFixture: SelectedSlotRepositoryFixture;

    const userEmail = `reserved-slot-20240813-user-${randomString()}@api.com`;
    let user: User;
    let eventTypeId: number;
    const eventTypeSlug = `reserved-slot-20240813-event-type-${randomString()}`;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, SchedulesModule_2024_04_15],
      })
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      selectedSlotRepositoryFixture = new SelectedSlotRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `reserved-slot-bookings-2024-08-13-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);

      const event = await eventTypesRepositoryFixture.create(
        {
          title: `reserved-slot-bookings-2024-08-13-event-type-${randomString()}`,
          slug: eventTypeSlug,
          length: 60,
          metadata: {
            disableStandardEmails: {
              all: {
                attendee: true,
                host: true,
              },
            },
          },
        },
        user.id
      );
      eventTypeId = event.id;

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    async function createReservedSlot(
      userId: number,
      eventTypeId: number,
      uid: string,
      startDate: Date,
      endDate: Date
    ): Promise<SelectedSlots> {
      const releaseAt = DateTime.utc().plus({ minutes: 15 }).toJSDate();

      return selectedSlotRepositoryFixture.create({
        userId,
        eventTypeId,
        uid,
        slotUtcStartDate: startDate,
        slotUtcEndDate: endDate,
        releaseAt,
        isSeat: false,
      });
    }

    describe("POST /v2/bookings", () => {
      describe("normal event type", () => {
        afterEach(async () => {
          await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
        });

        it("should create booking with reservedSlotUid from cookie and remove selected slot", async () => {
          const reservedSlotUid = `reserved-slot-${randomString()}`;
          const startTime = new Date("2040-05-21T09:30:00.000Z");
          const endTime = new Date("2040-05-21T10:30:00.000Z");

          await createReservedSlot(user.id, eventTypeId, reservedSlotUid, startTime, endTime);

          const bookingData: CreateBookingInput_2024_08_13 = {
            start: startTime.toISOString(),
            eventTypeId,
            attendee: {
              name: "Test Attendee",
              email: `reserved-slot-test-${randomString()}@example.com`,
              timeZone: "Europe/Rome",
            },
          };

          const response = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(bookingData)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set("Cookie", `${RESERVED_SLOT_UID_COOKIE_NAME}=${reservedSlotUid}`)
            .expect(201);

          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect((responseBody.data as BookingOutput_2024_08_13).id).toBeDefined();

          // Verify the selected slot was removed
          const remainingSlot = await selectedSlotRepositoryFixture.getByUid(reservedSlotUid);
          expect(remainingSlot).toBeNull();
        });

        it("should create booking with expired reservedSlotUid from cookie and remove selected slot", async () => {
          const reservedSlotUid = `reserved-slot-expired-${randomString()}`;
          const startTime = new Date("2040-05-21T09:30:00.000Z");
          const endTime = new Date("2040-05-21T10:30:00.000Z");

          await selectedSlotRepositoryFixture.create({
            userId: user.id,
            eventTypeId,
            uid: reservedSlotUid,
            slotUtcStartDate: startTime,
            slotUtcEndDate: endTime,
            releaseAt: DateTime.utc().minus({ minutes: 60 }).toJSDate(),
            isSeat: false,
          });

          const bookingData: CreateBookingInput_2024_08_13 = {
            start: startTime.toISOString(),
            eventTypeId,
            attendee: {
              name: "Test Attendee",
              email: `reserved-slot-test-${randomString()}@example.com`,
              timeZone: "Europe/Rome",
            },
          };

          const response = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(bookingData)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set("Cookie", `${RESERVED_SLOT_UID_COOKIE_NAME}=${reservedSlotUid}`)
            .expect(201);

          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect((responseBody.data as BookingOutput_2024_08_13).id).toBeDefined();

          // Verify the selected slot was removed
          const remainingSlot = await selectedSlotRepositoryFixture.getByUid(reservedSlotUid);
          expect(remainingSlot).toBeNull();
        });

        it("should create booking with reservedSlotUid from request body and remove selected slot", async () => {
          const reservedSlotUid = `reserved-slot-${randomString()}`;
          const startTime = new Date("2040-05-22T11:30:00.000Z");
          const endTime = new Date("2040-05-22T12:30:00.000Z");

          await createReservedSlot(user.id, eventTypeId, reservedSlotUid, startTime, endTime);

          const bookingData: CreateBookingInput_2024_08_13 = {
            start: startTime.toISOString(),
            eventTypeId,
            attendee: {
              name: "Test Attendee",
              email: `reserved-slot-test-${randomString()}@example.com`,
              timeZone: "Europe/Rome",
            },
            reservedSlotUid,
          };

          const response = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(bookingData)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201);

          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect((responseBody.data as BookingOutput_2024_08_13).id).toBeDefined();

          // Verify the selected slot was removed
          const remainingSlot = await selectedSlotRepositoryFixture.getByUid(reservedSlotUid);
          expect(remainingSlot).toBeNull();
        });

        it("should fail when trying to book with reservedSlotUid that is not first in line", async () => {
          const firstReservedSlotUid = `reserved-slot-first-${randomString()}`;
          const secondReservedSlotUid = `reserved-slot-second-${randomString()}`;
          const startTime = new Date("2040-05-21T13:30:00.000Z");
          const endTime = new Date("2040-05-21T14:30:00.000Z");

          await createReservedSlot(user.id, eventTypeId, firstReservedSlotUid, startTime, endTime);

          await new Promise((resolve) => setTimeout(resolve, 100));

          await createReservedSlot(user.id, eventTypeId, secondReservedSlotUid, startTime, endTime);

          const bookingData: CreateBookingInput_2024_08_13 = {
            start: startTime.toISOString(),
            eventTypeId,
            attendee: {
              name: "Test Attendee",
              email: `reserved-slot-test-${randomString()}@example.com`,
              timeZone: "Europe/Rome",
            },
            reservedSlotUid: secondReservedSlotUid, // Try to book with the second (not first in line)
          };

          const response = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(bookingData)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(409);

          const message: string = response.body.error.message;
          const match = message.match(/(\d+) seconds\.$/);
          expect(match).not.toBeNull();
          const secondsFromMessage = parseInt(match![1], 10);
          const expected = `Someone else reserved this booking time slot before you. This time slot will be freed up in ${secondsFromMessage} seconds.`;
          expect(message).toEqual(expected);

          const firstSlotStillExists = await selectedSlotRepositoryFixture.getByUid(firstReservedSlotUid);
          const secondSlotStillExists = await selectedSlotRepositoryFixture.getByUid(secondReservedSlotUid);
          expect(firstSlotStillExists).toBeTruthy();
          expect(secondSlotStillExists).toBeTruthy();

          await selectedSlotRepositoryFixture.deleteByUId(firstReservedSlotUid);
          await selectedSlotRepositoryFixture.deleteByUId(secondReservedSlotUid);
        });

        it("should allow booking with second reservedSlotUid when the first reservation has expired", async () => {
          const firstReservedSlotUid = `reserved-slot-first-expired-${randomString()}`;
          const secondReservedSlotUid = `reserved-slot-second-active-${randomString()}`;

          const startTime = new Date("2040-05-24T09:30:00.000Z");
          const endTime = new Date("2040-05-24T10:30:00.000Z");

          await selectedSlotRepositoryFixture.create({
            userId: user.id,
            eventTypeId,
            uid: firstReservedSlotUid,
            slotUtcStartDate: startTime,
            slotUtcEndDate: endTime,
            releaseAt: DateTime.utc().minus({ minutes: 1 }).toJSDate(),
            isSeat: false,
          });

          await new Promise((resolve) => setTimeout(resolve, 100));

          await selectedSlotRepositoryFixture.create({
            userId: user.id,
            eventTypeId,
            uid: secondReservedSlotUid,
            slotUtcStartDate: startTime,
            slotUtcEndDate: endTime,
            releaseAt: DateTime.utc().plus({ minutes: 15 }).toJSDate(),
            isSeat: false,
          });

          const bookingData: CreateBookingInput_2024_08_13 = {
            start: startTime.toISOString(),
            eventTypeId,
            attendee: {
              name: "Test Attendee",
              email: `reserved-slot-test-${randomString()}@example.com`,
              timeZone: "Europe/Rome",
            },
            reservedSlotUid: secondReservedSlotUid,
          };

          const response = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(bookingData)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201);

          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect((responseBody.data as BookingOutput_2024_08_13).id).toBeDefined();

          const firstSlotStillExists = await selectedSlotRepositoryFixture.getByUid(firstReservedSlotUid);
          const secondSlotRemoved = await selectedSlotRepositoryFixture.getByUid(secondReservedSlotUid);
          expect(firstSlotStillExists).toBeTruthy();
          expect(secondSlotRemoved).toBeNull();

          await selectedSlotRepositoryFixture.deleteByUId(firstReservedSlotUid);
        });

        it("should reschedule a booking with reservedSlotUid from cookie and remove selected slot", async () => {
          // 1. Create initial booking
          const initialStartTime = new Date("2040-05-21T09:30:00.000Z");

          const initialBookingData: CreateBookingInput_2024_08_13 = {
            start: initialStartTime.toISOString(),
            eventTypeId,
            attendee: {
              name: "Test Attendee Reschedule Cookie",
              email: `reserved-slot-reschedule-cookie-${randomString()}@example.com`,
              timeZone: "Europe/Rome",
            },
          };

          const createResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(initialBookingData)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201);

          const createdBooking = (createResponse.body as CreateBookingOutput_2024_08_13)
            .data as BookingOutput_2024_08_13;
          expect(createdBooking.uid).toBeDefined();

          // 2. Create reserved slot for rescheduling
          const reservedSlotUid = `reserved-slot-reschedule-${randomString()}`;
          const newStartTime = new Date("2040-05-22T11:30:00.000Z");
          const newEndTime = new Date("2040-05-22T12:30:00.000Z");

          await createReservedSlot(user.id, eventTypeId, reservedSlotUid, newStartTime, newEndTime);

          // 3. Reschedule booking
          const rescheduleData: RescheduleBookingInput_2024_08_13 = {
            start: newStartTime.toISOString(),
            reschedulingReason: "Rescheduling with cookie",
          };

          const rescheduleResponse = await request(app.getHttpServer())
            .post(`/v2/bookings/${createdBooking.uid}/reschedule`)
            .send(rescheduleData)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set("Cookie", `${RESERVED_SLOT_UID_COOKIE_NAME}=${reservedSlotUid}`)
            .expect(201);

          const rescheduleResponseBody: RescheduleBookingOutput_2024_08_13 = rescheduleResponse.body;
          expect(rescheduleResponseBody.status).toEqual(SUCCESS_STATUS);
          expect(rescheduleResponseBody.data).toBeDefined();

          // Verify new start time
          expect(new Date(rescheduleResponseBody.data.start).toISOString()).toEqual(
            newStartTime.toISOString()
          );

          // Verify the selected slot was removed
          const remainingSlot = await selectedSlotRepositoryFixture.getByUid(reservedSlotUid);
          expect(remainingSlot).toBeNull();
        });

        it("should reschedule a booking with reservedSlotUid from request body and remove selected slot", async () => {
          // 1. Create initial booking
          const initialStartTime = new Date("2040-05-21T09:30:00.000Z");

          const initialBookingData: CreateBookingInput_2024_08_13 = {
            start: initialStartTime.toISOString(),
            eventTypeId,
            attendee: {
              name: "Test Attendee Reschedule Body",
              email: `reserved-slot-reschedule-body-${randomString()}@example.com`,
              timeZone: "Europe/Rome",
            },
          };

          const createResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(initialBookingData)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201);

          const createdBooking = (createResponse.body as CreateBookingOutput_2024_08_13)
            .data as BookingOutput_2024_08_13;

          // 2. Create reserved slot for rescheduling
          const reservedSlotUid = `reserved-slot-reschedule-body-${randomString()}`;
          const newStartTime = new Date("2040-05-22T11:30:00.000Z");
          const newEndTime = new Date("2040-05-22T12:30:00.000Z");

          await createReservedSlot(user.id, eventTypeId, reservedSlotUid, newStartTime, newEndTime);

          // 3. Reschedule booking
          const rescheduleData: RescheduleBookingInput_2024_08_13 = {
            start: newStartTime.toISOString(),
            reschedulingReason: "Rescheduling with body",
            reservedSlotUid,
          };

          const rescheduleResponse = await request(app.getHttpServer())
            .post(`/v2/bookings/${createdBooking.uid}/reschedule`)
            .send(rescheduleData)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201);

          const rescheduleResponseBody: RescheduleBookingOutput_2024_08_13 = rescheduleResponse.body;
          expect(rescheduleResponseBody.status).toEqual(SUCCESS_STATUS);
          expect(rescheduleResponseBody.data).toBeDefined();

          // Verify new start time
          expect(new Date(rescheduleResponseBody.data.start).toISOString()).toEqual(
            newStartTime.toISOString()
          );

          // Verify the selected slot was removed
          const remainingSlot = await selectedSlotRepositoryFixture.getByUid(reservedSlotUid);
          expect(remainingSlot).toBeNull();
        });

        it("should fail when rescheduling with reservedSlotUid that is not first in line", async () => {
          // 1. Create initial booking
          const initialStartTime = new Date("2040-05-21T09:30:00.000Z");

          const initialBookingData: CreateBookingInput_2024_08_13 = {
            start: initialStartTime.toISOString(),
            eventTypeId,
            attendee: {
              name: "Test Attendee Reschedule Fail",
              email: `reserved-slot-reschedule-fail-${randomString()}@example.com`,
              timeZone: "Europe/Rome",
            },
          };

          const createResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(initialBookingData)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201);

          const createdBooking = (createResponse.body as CreateBookingOutput_2024_08_13)
            .data as BookingOutput_2024_08_13;

          // 2. Create two reserved slots for rescheduling
          const firstReservedSlotUid = `reserved-slot-reschedule-first-${randomString()}`;
          const secondReservedSlotUid = `reserved-slot-reschedule-second-${randomString()}`;
          const newStartTime = new Date("2040-05-22T11:30:00.000Z");
          const newEndTime = new Date("2040-05-22T12:30:00.000Z");

          await createReservedSlot(user.id, eventTypeId, firstReservedSlotUid, newStartTime, newEndTime);

          await new Promise((resolve) => setTimeout(resolve, 100));

          await createReservedSlot(user.id, eventTypeId, secondReservedSlotUid, newStartTime, newEndTime);

          // 3. Attempt to reschedule using the second reserved slot
          const rescheduleData: RescheduleBookingInput_2024_08_13 = {
            start: newStartTime.toISOString(),
            reschedulingReason: "Rescheduling fail test",
            reservedSlotUid: secondReservedSlotUid,
          };

          const rescheduleResponse = await request(app.getHttpServer())
            .post(`/v2/bookings/${createdBooking.uid}/reschedule`)
            .send(rescheduleData)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(409);

          const message: string = rescheduleResponse.body.error.message;
          const match = message.match(/(\d+) seconds\.$/);
          expect(match).not.toBeNull();
          const secondsFromMessage = parseInt(match![1], 10);
          const expected = `Someone else reserved this booking time slot before you. This time slot will be freed up in ${secondsFromMessage} seconds.`;
          expect(message).toEqual(expected);

          const firstSlotStillExists = await selectedSlotRepositoryFixture.getByUid(firstReservedSlotUid);
          const secondSlotStillExists = await selectedSlotRepositoryFixture.getByUid(secondReservedSlotUid);
          expect(firstSlotStillExists).toBeTruthy();
          expect(secondSlotStillExists).toBeTruthy();

          await selectedSlotRepositoryFixture.deleteByUId(firstReservedSlotUid);
          await selectedSlotRepositoryFixture.deleteByUId(secondReservedSlotUid);
        });
      });

      describe("recurring event type", () => {
        afterEach(async () => {
          await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
        });

        let recurringEventTypeId: number;
        const recurringEventTypeSlug = `recurring-reserved-slot-20240813-event-type-${randomString()}`;

        beforeAll(async () => {
          const recurringEvent = await eventTypesRepositoryFixture.create(
            {
              title: `recurring-reserved-slot-bookings-2024-08-13-event-type-${randomString()}`,
              slug: recurringEventTypeSlug,
              length: 60,
              recurringEvent: { freq: 2, count: 3, interval: 1 },
              metadata: {
                disableStandardEmails: {
                  all: {
                    attendee: true,
                    host: true,
                  },
                },
              },
            },
            user.id
          );
          recurringEventTypeId = recurringEvent.id;
        });

        it("should create booking with reservedSlotUid from cookie and remove selected slot", async () => {
          const reservedSlotUid = `reserved-slot-${randomString()}`;
          const startTime = new Date("2040-05-23T09:30:00.000Z");
          const endTime = new Date("2040-05-23T10:30:00.000Z");

          await createReservedSlot(user.id, recurringEventTypeId, reservedSlotUid, startTime, endTime);

          const bookingData: CreateBookingInput_2024_08_13 = {
            start: startTime.toISOString(),
            eventTypeId: recurringEventTypeId,
            attendee: {
              name: "Test Attendee",
              email: `reserved-slot-test-${randomString()}@example.com`,
              timeZone: "Europe/Rome",
            },
          };

          const response = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(bookingData)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set("Cookie", `${RESERVED_SLOT_UID_COOKIE_NAME}=${reservedSlotUid}`)
            .expect(201);

          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(Array.isArray(responseBody.data)).toBe(true);
          expect((responseBody.data as RecurringBookingOutput_2024_08_13[])[0].id).toBeDefined();

          const remainingSlot = await selectedSlotRepositoryFixture.getByUid(reservedSlotUid);
          expect(remainingSlot).toBeNull();
        });

        it("should create booking with reservedSlotUid from request body and remove selected slot", async () => {
          const reservedSlotUid = `reserved-slot-${randomString()}`;
          const startTime = new Date("2040-05-21T11:30:00.000Z");
          const endTime = new Date("2040-05-21T12:30:00.000Z");

          await createReservedSlot(user.id, recurringEventTypeId, reservedSlotUid, startTime, endTime);

          const bookingData: CreateBookingInput_2024_08_13 = {
            start: startTime.toISOString(),
            eventTypeId: recurringEventTypeId,
            attendee: {
              name: "Test Attendee",
              email: `reserved-slot-test-${randomString()}@example.com`,
              timeZone: "Europe/Rome",
            },
            reservedSlotUid,
          };

          const response = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(bookingData)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201);

          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(Array.isArray(responseBody.data)).toBe(true);
          expect((responseBody.data as RecurringBookingOutput_2024_08_13[])[0].id).toBeDefined();

          const remainingSlot = await selectedSlotRepositoryFixture.getByUid(reservedSlotUid);
          expect(remainingSlot).toBeNull();
        });

        it("should fail when trying to book with reservedSlotUid that is not first in line", async () => {
          const firstReservedSlotUid = `reserved-slot-first-${randomString()}`;
          const secondReservedSlotUid = `reserved-slot-second-${randomString()}`;
          const startTime = new Date("2040-05-21T13:30:00.000Z");
          const endTime = new Date("2040-05-21T14:30:00.000Z");

          await createReservedSlot(user.id, recurringEventTypeId, firstReservedSlotUid, startTime, endTime);

          await new Promise((resolve) => setTimeout(resolve, 100));

          await createReservedSlot(user.id, recurringEventTypeId, secondReservedSlotUid, startTime, endTime);

          const bookingData: CreateBookingInput_2024_08_13 = {
            start: startTime.toISOString(),
            eventTypeId: recurringEventTypeId,
            attendee: {
              name: "Test Attendee",
              email: `reserved-slot-test-${randomString()}@example.com`,
              timeZone: "Europe/Rome",
            },
            reservedSlotUid: secondReservedSlotUid,
          };

          const response = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(bookingData)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(409);

          const message: string = response.body.error.message;
          const match = message.match(/(\d+) seconds\.$/);
          expect(match).not.toBeNull();
          const secondsFromMessage = parseInt(match![1], 10);
          const expected = `Someone else reserved this booking time slot before you. This time slot will be freed up in ${secondsFromMessage} seconds.`;
          expect(message).toEqual(expected);

          const firstSlotStillExists = await selectedSlotRepositoryFixture.getByUid(firstReservedSlotUid);
          const secondSlotStillExists = await selectedSlotRepositoryFixture.getByUid(secondReservedSlotUid);
          expect(firstSlotStillExists).toBeTruthy();
          expect(secondSlotStillExists).toBeTruthy();

          await selectedSlotRepositoryFixture.deleteByUId(firstReservedSlotUid);
          await selectedSlotRepositoryFixture.deleteByUId(secondReservedSlotUid);
        });
      });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await app.close();
    });
  });
});
