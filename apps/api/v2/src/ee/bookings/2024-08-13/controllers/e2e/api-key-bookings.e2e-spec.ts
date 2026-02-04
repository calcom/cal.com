import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import {
  AttendeeCancelledEmail,
  AttendeeRescheduledEmail,
  AttendeeScheduledEmail,
  OrganizerCancelledEmail,
  OrganizerRescheduledEmail,
  OrganizerScheduledEmail,
} from "@calcom/platform-libraries/emails";
import {
  BookingOutput_2024_08_13,
  CancelBookingInput_2024_08_13,
  CreateBookingInput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
} from "@calcom/platform-types";
import type { Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CancelBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/cancel-booking.output";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { RescheduleBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/reschedule-booking.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

jest.spyOn(AttendeeScheduledEmail.prototype as any, "getHtml").mockImplementation(async function () {
  return "<html><body>Mocked Email Content</body></html>";
});

jest.spyOn(OrganizerScheduledEmail.prototype as any, "getHtml").mockImplementation(async function () {
  return "<html><body>Mocked Email Content</body></html>";
});

jest
  .spyOn(AttendeeRescheduledEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));
jest
  .spyOn(OrganizerRescheduledEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));
jest
  .spyOn(AttendeeCancelledEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));
jest
  .spyOn(OrganizerCancelledEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));

describe("Bookings Endpoints 2024-08-13", () => {
  describe("With api key", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
    let apiKeyString: string;

    const userEmail = `api-key-bookings-2024-08-13-user-${randomString()}@api.com`;
    let user: User;

    let eventTypeId: number;
    const eventTypeSlug = `api-key-bookings-2024-08-13-event-type-${randomString()}`;

    let createdBooking: BookingOutput_2024_08_13;
    let rescheduledBooking: BookingOutput_2024_08_13;

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
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);
      apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);

      organization = await teamRepositoryFixture.create({
        name: `api-key-bookings-organization-${randomString()}`,
      });

      user = await userRepositoryFixture.create({
        email: userEmail,
      });

      const { keyString } = await apiKeysRepositoryFixture.createApiKey(user.id, null);
      apiKeyString = keyString;

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `api-key-bookings-e2e-api-key-bookings-2024-08-13-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);
      const event = await eventTypesRepositoryFixture.create(
        {
          title: `api-key-bookings-e2e-api-key-bookings-2024-08-13-event-type-${randomString()}`,
          slug: eventTypeSlug,
          length: 60,
        },
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

    it("should create a booking with api key", async () => {
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
        eventTypeId,
        attendee: {
          name: "Mr Key",
          email: "mr_key@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
        meetingUrl: "https://meet.google.com/abc-def-ghi",
      };

      return request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
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
            expect(data.hosts[0].id).toEqual(user.id);
            expect(data.status).toEqual("accepted");
            expect(data.start).toEqual(body.start);
            expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 8, 14, 0, 0)).toISOString());
            expect(data.duration).toEqual(60);
            expect(data.eventTypeId).toEqual(eventTypeId);
            expect(data.attendees[0]).toEqual({
              name: body.attendee.name,
              email: body.attendee.email,
              displayEmail: body.attendee.email,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
            });
            expect(data.meetingUrl).toEqual(body.meetingUrl);
            expect(data.absentHost).toEqual(false);
            expect(AttendeeScheduledEmail.prototype.getHtml).toHaveBeenCalled();
            expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled();
            createdBooking = data;
          } else {
            throw new Error(
              "Invalid response data - expected booking but received array of possibly recurring bookings"
            );
          }
        });
    });

    it("should reschedule a booking with api key", async () => {
      const body: RescheduleBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2035, 0, 8, 14, 0, 0)).toISOString(),
        reschedulingReason: "Flying to mars that day",
      };

      return request(app.getHttpServer())
        .post(`/v2/bookings/${createdBooking.uid}/reschedule`)
        .send(body)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201)
        .then(async (response) => {
          const responseBody: RescheduleBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsBooking(responseBody.data)).toBe(true);

          if (responseDataIsBooking(responseBody.data)) {
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            const data: BookingOutput_2024_08_13 = responseBody.data;
            expect(data.reschedulingReason).toEqual(body.reschedulingReason);
            expect(data.start).toEqual(body.start);
            expect(data.end).toEqual(new Date(Date.UTC(2035, 0, 8, 15, 0, 0)).toISOString());
            expect(data.rescheduledFromUid).toEqual(createdBooking.uid);
            expect(data.id).toBeDefined();
            expect(data.uid).toBeDefined();
            expect(data.hosts[0].id).toEqual(user.id);
            expect(data.status).toEqual(createdBooking.status);
            expect(data.duration).toEqual(createdBooking.duration);
            expect(data.eventTypeId).toEqual(createdBooking.eventTypeId);
            expect(data.attendees[0]).toEqual(createdBooking.attendees[0]);
            expect(data.location).toEqual(createdBooking.location);
            expect(data.absentHost).toEqual(createdBooking.absentHost);
            expect(data.metadata).toEqual(createdBooking.metadata);
            expect(AttendeeRescheduledEmail.prototype.getHtml).toHaveBeenCalled();
            expect(OrganizerRescheduledEmail.prototype.getHtml).toHaveBeenCalled();
            rescheduledBooking = data;
          } else {
            throw new Error(
              "Invalid response data - expected booking but received array of possibly recurring bookings"
            );
          }
        });
    });

    it("should cancel booking", async () => {
      const body: CancelBookingInput_2024_08_13 = {
        cancellationReason: "Going on a vacation",
      };

      const booking = await bookingsRepositoryFixture.getByUid(rescheduledBooking.uid);
      expect(booking).toBeDefined();
      expect(booking?.status).toEqual("ACCEPTED");

      return request(app.getHttpServer())
        .post(`/v2/bookings/${rescheduledBooking.uid}/cancel`)
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: CancelBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          const data: BookingOutput_2024_08_13 = responseBody.data;
          expect(data.id).toBeDefined();
          expect(data.uid).toBeDefined();
          expect(data.hosts[0].id).toEqual(user.id);
          expect(data.status).toEqual("cancelled");
          expect(data.cancellationReason).toEqual(body.cancellationReason);
          expect(data.start).toEqual(rescheduledBooking.start);
          expect(data.end).toEqual(rescheduledBooking.end);
          expect(data.duration).toEqual(rescheduledBooking.duration);
          expect(data.eventTypeId).toEqual(rescheduledBooking.eventTypeId);
          expect(data.attendees[0]).toEqual(rescheduledBooking.attendees[0]);
          expect(data.location).toEqual(rescheduledBooking.location);
          expect(data.absentHost).toEqual(rescheduledBooking.absentHost);

          const cancelledBooking = await bookingsRepositoryFixture.getByUid(rescheduledBooking.uid);
          expect(cancelledBooking).toBeDefined();
          expect(cancelledBooking?.status).toEqual("CANCELLED");
          expect(AttendeeCancelledEmail.prototype.getHtml).toHaveBeenCalled();
          expect(OrganizerCancelledEmail.prototype.getHtml).toHaveBeenCalled();
        });
    });

    function responseDataIsBooking(data: any): data is BookingOutput_2024_08_13 {
      return !Array.isArray(data) && typeof data === "object" && data && "id" in data;
    }

    afterAll(async () => {
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(user.email);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await app.close();
    });
  });
});
