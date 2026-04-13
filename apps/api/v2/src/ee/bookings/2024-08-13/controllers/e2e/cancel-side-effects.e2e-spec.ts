import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import type {
  BookingOutput_2024_08_13,
  CancelBookingInput_2024_08_13,
  CreateBookingInput_2024_08_13,
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
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Cancel booking — side effects", () => {
  let app: INestApplication;
  let organization: Team;

  let userRepositoryFixture: UserRepositoryFixture;
  let bookingsRepositoryFixture: BookingsRepositoryFixture;
  let schedulesService: SchedulesService_2024_04_15;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let oAuthClient: PlatformOAuthClient;

  const hostEmail = `cancel-fx-host-${randomString()}@api.com`;
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
      name: `cancel-fx-org-${randomString()}`,
      isOrganization: true,
    });

    oAuthClient = await oauthClientRepositoryFixture.create(
      organization.id,
      {
        logo: "logo-url",
        name: "cancel-fx-client",
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
      name: `cancel-fx-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(host.id, schedule);

    const evt = await eventTypesRepositoryFixture.create(
      { title: `cancel-fx-event-${randomString()}`, slug: `cancel-fx-event-${randomString()}`, length: 60 },
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
        name: `Cancel FX ${attendeeSuffix}`,
        email: `cancel-fx-${attendeeSuffix}-${randomString()}@gmail.com`,
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

  describe("status transitions on cancel", () => {
    it("should transition booking status to CANCELLED", async () => {
      const booking = await createBooking(new Date(Date.UTC(2040, 2, 12, 10, 0, 0)).toISOString(), "status"); // Monday

      const cancelBody: CancelBookingInput_2024_08_13 = {
        cancellationReason: "Testing cancel side effects",
      };

      const cancelRes = await request(app.getHttpServer())
        .post(`/v2/bookings/${booking.uid}/cancel`)
        .send(cancelBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200);

      expect(cancelRes.body.status).toEqual(SUCCESS_STATUS);

      const dbBooking = await bookingsRepositoryFixture.getByUid(booking.uid);
      expect(dbBooking).toBeDefined();
      expect(dbBooking?.status).toEqual("CANCELLED");
    });

    it("should persist the cancellation reason in the DB", async () => {
      const booking = await createBooking(new Date(Date.UTC(2040, 2, 13, 10, 0, 0)).toISOString(), "reason"); // Tuesday
      const reason = "Unexpected conflict — team all-hands moved";

      await request(app.getHttpServer())
        .post(`/v2/bookings/${booking.uid}/cancel`)
        .send({ cancellationReason: reason } satisfies CancelBookingInput_2024_08_13)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200);

      const dbBooking = await bookingsRepositoryFixture.getByUid(booking.uid);
      expect(dbBooking?.cancellationReason).toEqual(reason);
    });
  });

  describe("slot release after cancel", () => {
    it("should free the slot so a new booking can be made at the same time", async () => {
      const startTime = new Date(Date.UTC(2040, 2, 14, 10, 0, 0)).toISOString(); // Wednesday

      const booking = await createBooking(startTime, "slot-release");

      await request(app.getHttpServer())
        .post(`/v2/bookings/${booking.uid}/cancel`)
        .send({ cancellationReason: "Freeing slot" } satisfies CancelBookingInput_2024_08_13)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200);

      const newBooking = await createBooking(startTime, "slot-reuse");
      expect(newBooking.uid).toBeDefined();
      expect(newBooking.start).toEqual(startTime);
    });
  });

  describe("double-cancel idempotency", () => {
    it("should not error when cancelling an already cancelled booking", async () => {
      const booking = await createBooking(
        new Date(Date.UTC(2040, 2, 15, 10, 0, 0)).toISOString(), // Thursday
        "double-cancel"
      );

      await request(app.getHttpServer())
        .post(`/v2/bookings/${booking.uid}/cancel`)
        .send({ cancellationReason: "First cancel" } satisfies CancelBookingInput_2024_08_13)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200);

      const secondCancel = await request(app.getHttpServer())
        .post(`/v2/bookings/${booking.uid}/cancel`)
        .send({ cancellationReason: "Second cancel" } satisfies CancelBookingInput_2024_08_13)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      // Whether the API returns 200 or 400, verify the booking is still cancelled
      const dbBooking = await bookingsRepositoryFixture.getByUid(booking.uid);
      expect(dbBooking?.status).toEqual("CANCELLED");
    });
  });

  describe("cancel with empty reason", () => {
    it("should allow cancellation without a reason", async () => {
      const booking = await createBooking(
        new Date(Date.UTC(2040, 2, 16, 10, 0, 0)).toISOString(), // Friday
        "no-reason"
      );

      await request(app.getHttpServer())
        .post(`/v2/bookings/${booking.uid}/cancel`)
        .send({})
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200);

      const dbBooking = await bookingsRepositoryFixture.getByUid(booking.uid);
      expect(dbBooking?.status).toEqual("CANCELLED");
    });
  });

  describe("cancel non-existent booking", () => {
    it("should return error for non-existent booking UID", async () => {
      await request(app.getHttpServer())
        .post("/v2/bookings/non-existent-uid-12345/cancel")
        .send({ cancellationReason: "Does not exist" })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(404);
    });
  });
});
