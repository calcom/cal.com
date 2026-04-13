import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import type {
  BookingOutput_2024_08_13,
  CreateBookingInput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
} from "@calcom/platform-types";
import type { PlatformOAuthClient, Team, User } from "@calcom/prisma/client";
import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
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

describe("Reschedule booking — side effects", () => {
  let app: INestApplication;
  let organization: Team;

  let userRepositoryFixture: UserRepositoryFixture;
  let bookingsRepositoryFixture: BookingsRepositoryFixture;
  let schedulesService: SchedulesService_2024_04_15;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let oAuthClient: PlatformOAuthClient;

  const hostEmail = `resched-fx-host-${randomString()}@api.com`;
  let host: User;

  let eventTypeId: number;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      hostEmail,
      Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, SchedulesModule_2024_04_15],
      })
    )
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);
    eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

    organization = await teamRepositoryFixture.create({
      name: `resched-fx-org-${randomString()}`,
      isOrganization: true,
    });

    oAuthClient = await oauthClientRepositoryFixture.create(
      organization.id,
      {
        logo: "logo-url",
        name: "resched-fx-client",
        redirectUris: ["http://localhost:5555"],
        permissions: 32,
      },
      "secret"
    );

    host = await userRepositoryFixture.create({
      email: hostEmail,
      username: hostEmail,
      platformOAuthClients: { connect: { id: oAuthClient.id } },
    });

    const schedule: CreateScheduleInput_2024_04_15 = {
      name: `resched-fx-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(host.id, schedule);

    const evt = await eventTypesRepositoryFixture.create(
      { title: `resched-fx-event-${randomString()}`, slug: `resched-fx-event-${randomString()}`, length: 60 },
      host.id
    );
    eventTypeId = evt.id;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  afterAll(async () => {
    await bookingsRepositoryFixture.deleteAllBookings(host.id, host.email);
    await oauthClientRepositoryFixture.delete(oAuthClient.id);
    await teamRepositoryFixture.delete(organization.id);
    await userRepositoryFixture.deleteByEmail(host.email);
    await app.close();
  });

  async function createBooking(startIso: string, attendeeSuffix: string): Promise<BookingOutput_2024_08_13> {
    const body: CreateBookingInput_2024_08_13 = {
      start: startIso,
      eventTypeId,
      attendee: {
        name: `Resched FX ${attendeeSuffix}`,
        email: `resched-fx-${attendeeSuffix}-${randomString()}@gmail.com`,
        timeZone: "Europe/Rome",
        language: "it",
      },
      location: "https://meet.google.com/abc-def-ghi",
    };

    const res = await request(app.getHttpServer())
      .post("/v2/bookings")
      .send(body)
      .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
      .expect(201);

    return (res.body as CreateBookingOutput_2024_08_13).data;
  }

  function isBooking(data: unknown): data is BookingOutput_2024_08_13 {
    return !Array.isArray(data) && typeof data === "object" && data !== null && "id" in data;
  }

  describe("basic reschedule side effects", () => {
    it("should create a new booking and cancel the old one", async () => {
      const oldStart = new Date(Date.UTC(2040, 2, 19, 10, 0, 0)).toISOString(); // Monday
      const newStart = new Date(Date.UTC(2040, 2, 20, 10, 0, 0)).toISOString(); // Tuesday

      const original = await createBooking(oldStart, "basic");

      const rescheduleBody: RescheduleBookingInput_2024_08_13 = {
        start: newStart,
        reschedulingReason: "Conflict with another meeting",
      };

      const res = await request(app.getHttpServer())
        .post(`/v2/bookings/${original.uid}/reschedule`)
        .send(rescheduleBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      expect(res.body.status).toEqual(SUCCESS_STATUS);
      const rescheduledData = (res.body as RescheduleBookingOutput_2024_08_13).data;
      expect(isBooking(rescheduledData)).toBe(true);

      if (isBooking(rescheduledData)) {
        expect(rescheduledData.start).toEqual(newStart);
        expect(rescheduledData.uid).not.toEqual(original.uid);
        expect(rescheduledData.status).toEqual("accepted");
      }

      const oldBooking = await bookingsRepositoryFixture.getByUid(original.uid);
      expect(oldBooking).toBeDefined();
      expect(oldBooking?.status).toEqual("CANCELLED");
      expect(oldBooking?.rescheduled).toBe(true);
    });
  });

  describe("old slot freed after reschedule", () => {
    it("should free the original time slot so a new booking can occupy it", async () => {
      const originalStart = new Date(Date.UTC(2040, 2, 21, 10, 0, 0)).toISOString(); // Wednesday
      const rescheduledStart = new Date(Date.UTC(2040, 2, 22, 10, 0, 0)).toISOString(); // Thursday

      const original = await createBooking(originalStart, "free-slot");

      await request(app.getHttpServer())
        .post(`/v2/bookings/${original.uid}/reschedule`)
        .send({
          start: rescheduledStart,
          reschedulingReason: "Moved",
        } satisfies RescheduleBookingInput_2024_08_13)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      const newBooking = await createBooking(originalStart, "takes-old-slot");
      expect(newBooking.uid).toBeDefined();
      expect(newBooking.start).toEqual(originalStart);
    });
  });

  describe("reschedule to occupied slot", () => {
    it("should reject reschedule if the new time slot is already occupied", async () => {
      const slotA = new Date(Date.UTC(2040, 2, 23, 10, 0, 0)).toISOString(); // Friday
      const slotB = new Date(Date.UTC(2040, 2, 23, 14, 0, 0)).toISOString(); // Friday afternoon

      await createBooking(slotB, "occupier");
      const toReschedule = await createBooking(slotA, "mover");

      await request(app.getHttpServer())
        .post(`/v2/bookings/${toReschedule.uid}/reschedule`)
        .send({
          start: slotB,
          reschedulingReason: "Trying occupied slot",
        } satisfies RescheduleBookingInput_2024_08_13)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(400);

      const dbBooking = await bookingsRepositoryFixture.getByUid(toReschedule.uid);
      expect(dbBooking?.status).toEqual("ACCEPTED");
    });
  });

  describe("reschedule cancelled booking", () => {
    it("should reject reschedule of a cancelled booking", async () => {
      const start = new Date(Date.UTC(2040, 2, 26, 10, 0, 0)).toISOString(); // Monday
      const newStart = new Date(Date.UTC(2040, 2, 27, 10, 0, 0)).toISOString(); // Tuesday

      const booking = await createBooking(start, "cancel-then-resched");

      await request(app.getHttpServer())
        .post(`/v2/bookings/${booking.uid}/cancel`)
        .send({ cancellationReason: "Cancel first" })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/v2/bookings/${booking.uid}/reschedule`)
        .send({
          start: newStart,
          reschedulingReason: "Try to revive",
        } satisfies RescheduleBookingInput_2024_08_13)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(400);

      expect(res.body.error.message).toContain("cancelled");
    });
  });

  describe("chain reschedule", () => {
    it("should not allow rescheduling an already-rescheduled booking", async () => {
      const start1 = new Date(Date.UTC(2040, 2, 28, 10, 0, 0)).toISOString(); // Wednesday
      const start2 = new Date(Date.UTC(2040, 2, 29, 10, 0, 0)).toISOString(); // Thursday
      const start3 = new Date(Date.UTC(2040, 2, 30, 10, 0, 0)).toISOString(); // Friday

      const original = await createBooking(start1, "chain-1");

      const firstReschedRes = await request(app.getHttpServer())
        .post(`/v2/bookings/${original.uid}/reschedule`)
        .send({ start: start2, reschedulingReason: "First move" } satisfies RescheduleBookingInput_2024_08_13)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      const rescheduledData = (firstReschedRes.body as RescheduleBookingOutput_2024_08_13).data;

      const secondReschedRes = await request(app.getHttpServer())
        .post(`/v2/bookings/${original.uid}/reschedule`)
        .send({
          start: start3,
          reschedulingReason: "Second move on old uid",
        } satisfies RescheduleBookingInput_2024_08_13)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(400);

      expect(secondReschedRes.body.error.message).toContain("cancelled");

      if (isBooking(rescheduledData)) {
        const reschedRes2 = await request(app.getHttpServer())
          .post(`/v2/bookings/${rescheduledData.uid}/reschedule`)
          .send({
            start: start3,
            reschedulingReason: "Move via new uid",
          } satisfies RescheduleBookingInput_2024_08_13)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201);

        expect(reschedRes2.body.status).toEqual(SUCCESS_STATUS);
      }
    });
  });

  describe("reschedule non-existent booking", () => {
    it("should return 404 for non-existent booking UID", async () => {
      await request(app.getHttpServer())
        .post("/v2/bookings/non-existent-uid-99999/reschedule")
        .send({
          start: new Date(Date.UTC(2040, 3, 2, 10, 0, 0)).toISOString(), // Monday
          reschedulingReason: "Ghost booking",
        } satisfies RescheduleBookingInput_2024_08_13)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(404);
    });
  });
});
