import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
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

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import { CreateBookingInput_2024_08_13, BookingOutput_2024_08_13 } from "@calcom/platform-types";

describe("Bookings Endpoints 2024-08-13", () => {
  describe("User Authenticated", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;

    const userEmail = "bookings-controller-e2e@api.com";
    let user: User;

    let eventTypeId: number;

    let createdBooking: BookingOutput_2024_08_13;

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
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(2030, 0, 8, 13, 0, 0).toISOString(),
        eventTypeId,
        attendee: {
          name: "Mr Proper",
          email: "mr_proper@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
        meetingUrl: "https://meet.google.com/abc-def-ghi",
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
            expect(data.hostId).toEqual(user.id);
            expect(data.status).toEqual("accepted");
            expect(data.start).toEqual(body.start);
            expect(data.end).toEqual(new Date(2030, 0, 8, 14, 0, 0).toISOString());
            expect(data.duration).toEqual(60);
            expect(data.eventTypeId).toEqual(eventTypeId);
            expect(data.attendee).toEqual({ ...body.attendee, absent: false });
            expect(data.meetingUrl).toEqual(body.meetingUrl);
            expect(data.absentHost).toEqual(false);
            createdBooking = data;
          } else {
            throw new Error(
              "Invalid response data - expected booking but received array of possibily recurring bookings"
            );
          }
        });
    });

    function responseDataIsBooking(data: any): data is BookingOutput_2024_08_13 {
      return !Array.isArray(data) && typeof data === "object" && data && "id" in data;
    }

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await app.close();
    });
  });
});
