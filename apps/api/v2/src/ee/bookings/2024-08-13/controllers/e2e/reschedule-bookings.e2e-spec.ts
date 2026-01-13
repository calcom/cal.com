import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import type {
  BookingOutput_2024_08_13,
  CreateBookingInput_2024_08_13,
  GetBookingOutput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
} from "@calcom/platform-types";
import type { EventType, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
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

describe("Reschedule bookings 2024-08-13", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let schedulesService: SchedulesService_2024_04_15;

  let normalBookingUser: User;
  let normalBookingEventType: EventType;
  let normalBookingEventTypeId: number;
  const normalBookingUserEmail = `user-bookings-normal-user-${randomString(5)}@api.com`;
  const normalBookingEventTypeSlug = `user-bookings-normal-event-type-${randomString(5)}`;
  let oldNormalBooking: BookingOutput_2024_08_13;
  let newNormalBooking: BookingOutput_2024_08_13;

  const RESCHEDULE_REASON = "Flying to venus that day";
  const RESCHEDULED_BY = `user-venus-bookings-rescheduler-${randomString(5)}@api.com`;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      normalBookingUserEmail,
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
    eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
    schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

    // initialize normal booking user, schedule and event type
    normalBookingUser = await userRepositoryFixture.create({
      email: normalBookingUserEmail,
      username: normalBookingUserEmail,
    });

    const userSchedule: CreateScheduleInput_2024_04_15 = {
      name: `user-bookings-normal-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(normalBookingUser.id, userSchedule);

    normalBookingEventType = await eventTypesRepositoryFixture.create(
      {
        title: `user-bookings-normal-event-type-${randomString()}`,
        slug: normalBookingEventTypeSlug,
        length: 60,
      },
      normalBookingUser.id
    );
    normalBookingEventTypeId = normalBookingEventType.id;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  describe("reschedule normal booking", () => {
    it("should create a booking to be rescheduled", async () => {
      const bookingBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2040, 1, 9, 10, 0, 0)).toISOString(),
        eventTypeId: normalBookingEventTypeId,
        attendee: {
          name: `user-venus-bookings-attendee-${randomString(10)}`,
          email: `user-venus-bookings-attendee-${randomString(10)}@gmail.com`,
          timeZone: "Europe/Rome",
          language: "it",
        },
        location: "https://meet.google.com/oj12u83128u9312ou3",
      };

      const bookingResponse = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(bookingBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      const bookingResponseBody: CreateBookingOutput_2024_08_13 = bookingResponse.body;
      expect(bookingResponseBody.data).toBeDefined();
      expect(responseDataIsBooking(bookingResponseBody.data)).toBe(true);
      if (responseDataIsBooking(bookingResponseBody.data)) {
        const created: BookingOutput_2024_08_13 = bookingResponseBody.data;
        oldNormalBooking = created;
        expect(oldNormalBooking).toBeDefined();
        expect(oldNormalBooking.uid).toBeDefined();
      } else {
        throw new Error("should create a booking to be rescheduled - Invalid response data");
      }
    });

    it("should reschedule", async () => {
      const body: RescheduleBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2040, 1, 9, 12, 0, 0)).toISOString(),
        reschedulingReason: RESCHEDULE_REASON,
        rescheduledBy: RESCHEDULED_BY,
      };

      const beforeCreate = new Date();
      return request(app.getHttpServer())
        .post(`/v2/bookings/${oldNormalBooking.uid}/reschedule`)
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201)
        .then(async (response) => {
          const afterCreate = new Date();
          const responseBody: RescheduleBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          const data: BookingOutput_2024_08_13 = responseBody.data as BookingOutput_2024_08_13;
          expect(data.reschedulingReason).toEqual(RESCHEDULE_REASON);
          expect(data.rescheduledFromUid).toEqual(oldNormalBooking.uid);
          expect(data.rescheduledByEmail).toEqual(RESCHEDULED_BY);

          expect(data.start).toEqual(body.start);
          expect(data.end).toEqual(new Date(Date.UTC(2040, 1, 9, 13, 0, 0)).toISOString());
          expect(data.id).toBeDefined();
          expect(data.uid).toBeDefined();
          expect(data.hosts[0].id).toEqual(normalBookingUser.id);
          expect(data.hosts[0].username).toEqual(normalBookingUser.username);
          expect(data.hosts[0].email).toEqual(normalBookingUser.email);
          expect(data.status).toEqual(oldNormalBooking.status);
          expect(data.duration).toEqual(oldNormalBooking.duration);
          expect(data.eventTypeId).toEqual(oldNormalBooking.eventTypeId);
          expect(data.attendees[0]).toEqual(oldNormalBooking.attendees[0]);
          expect(data.location).toEqual(oldNormalBooking.location);
          expect(data.absentHost).toEqual(oldNormalBooking.absentHost);
          expect(data.metadata).toEqual(oldNormalBooking.metadata);

          newNormalBooking = data;
          expect(newNormalBooking).toBeDefined();

          const createdAtDate = new Date(data.createdAt);
          expect(createdAtDate.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
          expect(createdAtDate.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
        });
    });

    it("should fetch old booking and verify rescheduledToUid and rescheduledByEmail and status cancelled", async () => {
      return request(app.getHttpServer())
        .get(`/v2/bookings/${oldNormalBooking.uid}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsBooking(responseBody.data)).toBe(true);

          if (responseDataIsBooking(responseBody.data)) {
            const data: BookingOutput_2024_08_13 = responseBody.data;
            expect(data.rescheduledToUid).toEqual(newNormalBooking.uid);
            expect(data.rescheduledByEmail).toEqual(RESCHEDULED_BY);
            expect(data.status).toEqual("cancelled");
          } else {
            throw new Error(
              "Invalid response data - expected booking but received array of possibly recurring bookings"
            );
          }
        });
    });

    it("should fetch new booking and verify rescheduledFromUid, rescheduledByEmail and reschedulingReason", async () => {
      return request(app.getHttpServer())
        .get(`/v2/bookings/${newNormalBooking.uid}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsBooking(responseBody.data)).toBe(true);

          if (responseDataIsBooking(responseBody.data)) {
            const data: BookingOutput_2024_08_13 = responseBody.data;
            expect(data.rescheduledFromUid).toEqual(oldNormalBooking.uid);
            expect(data.rescheduledByEmail).toEqual(RESCHEDULED_BY);
            expect(data.reschedulingReason).toEqual(RESCHEDULE_REASON);
            expect(data.status).toEqual("accepted");
          } else {
            throw new Error(
              "Invalid response data - expected booking but received array of possibly recurring bookings"
            );
          }
        });
    });
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(normalBookingUser.email);
  });

  function responseDataIsBooking(data: unknown): data is BookingOutput_2024_08_13 {
    return !Array.isArray(data) && typeof data === "object" && data !== null && data && "id" in data;
  }
});
