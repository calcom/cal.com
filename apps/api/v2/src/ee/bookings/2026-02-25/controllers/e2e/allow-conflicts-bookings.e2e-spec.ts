import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2026_02_25 } from "@calcom/platform-constants";
import type { BookingOutput_2024_08_13, CreateBookingInput_2024_08_13 } from "@calcom/platform-types";
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
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Bookings Endpoints 2026-02-25 — allowConflicts", () => {
  let app: INestApplication;
  let organization: Team;

  let userRepositoryFixture: UserRepositoryFixture;
  let bookingsRepositoryFixture: BookingsRepositoryFixture;
  let schedulesService: SchedulesService_2024_04_15;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let oAuthClient: PlatformOAuthClient;

  const hostEmail = `allow-conflicts-host-${randomString()}@api.com`;
  let host: User;

  let eventTypeId: number;
  let eventTypeId2: number;
  const eventTypeSlug = `allow-conflicts-event-type-${randomString()}`;
  const eventTypeSlug2 = `allow-conflicts-event-type-2-${randomString()}`;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      hostEmail,
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
    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

    organization = await teamRepositoryFixture.create({
      name: `allow-conflicts-org-${randomString()}`,
      isOrganization: true,
    });

    oAuthClient = await oauthClientRepositoryFixture.create(
      organization.id,
      {
        logo: "logo-url",
        name: "name",
        redirectUris: ["http://localhost:5555"],
        permissions: 32,
      },
      "secret"
    );

    host = await userRepositoryFixture.create({
      email: hostEmail,
      username: hostEmail,
      platformOAuthClients: {
        connect: {
          id: oAuthClient.id,
        },
      },
    });

    const userSchedule: CreateScheduleInput_2024_04_15 = {
      name: `allow-conflicts-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(host.id, userSchedule);

    const event = await eventTypesRepositoryFixture.create(
      {
        title: `allow-conflicts-event-type-${randomString()}`,
        slug: eventTypeSlug,
        length: 60,
      },
      host.id
    );
    eventTypeId = event.id;

    // Second event type with different length (30 min) to avoid idempotency key collision
    // (idempotency key = hash of startTime + endTime + userId)
    const event2 = await eventTypesRepositoryFixture.create(
      {
        title: `allow-conflicts-event-type-2-${randomString()}`,
        slug: eventTypeSlug2,
        length: 30,
      },
      host.id
    );
    eventTypeId2 = event2.id;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  function responseDataIsBooking(data: unknown): data is BookingOutput_2024_08_13 {
    return !Array.isArray(data) && typeof data === "object" && data !== null && "id" in data;
  }

  it("should create a booking with allowConflicts=true as host at an occupied time slot", async () => {
    const startTime = new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString();

    // Book eventTypeId (60 min) to occupy the host's time slot
    const firstBody: CreateBookingInput_2024_08_13 = {
      start: startTime,
      eventTypeId,
      attendee: {
        name: "First Attendee",
        email: "first-attendee@gmail.com",
        timeZone: "Europe/Rome",
        language: "it",
      },
      location: "https://meet.google.com/abc-def-ghi",
    };

    const firstResponse = await request(app.getHttpServer())
      .post("/v2/bookings")
      .send(firstBody)
      .set(CAL_API_VERSION_HEADER, VERSION_2026_02_25)
      .expect(201);

    expect(firstResponse.body.status).toEqual(SUCCESS_STATUS);
    expect(responseDataIsBooking(firstResponse.body.data)).toBe(true);

    // Book eventTypeId2 (30 min) at the same start time with allowConflicts=true.
    // Uses a different event type length so the endTime differs, avoiding idempotency key collision.
    const conflictingBody: CreateBookingInput_2024_08_13 = {
      start: startTime,
      eventTypeId: eventTypeId2,
      attendee: {
        name: "Second Attendee",
        email: "second-attendee@gmail.com",
        timeZone: "Europe/Rome",
        language: "it",
      },
      location: "https://meet.google.com/abc-def-ghi",
      allowConflicts: true,
    };

    const conflictResponse = await request(app.getHttpServer())
      .post("/v2/bookings")
      .send(conflictingBody)
      .set(CAL_API_VERSION_HEADER, VERSION_2026_02_25)
      .expect(201);

    expect(conflictResponse.body.status).toEqual(SUCCESS_STATUS);
    expect(responseDataIsBooking(conflictResponse.body.data)).toBe(true);

    if (responseDataIsBooking(conflictResponse.body.data)) {
      const data: BookingOutput_2024_08_13 = conflictResponse.body.data;
      expect(data.start).toEqual(startTime);
      expect(data.eventTypeId).toEqual(eventTypeId2);
    }
  });

  it("should silently ignore allowConflicts=true when user is not a host of the event type", async () => {
    const nonHostEmail = `non-host-${randomString()}@api.com`;
    const nonHost = await userRepositoryFixture.create({
      email: nonHostEmail,
      username: nonHostEmail,
      platformOAuthClients: {
        connect: {
          id: oAuthClient.id,
        },
      },
    });

    const nonHostSchedule: CreateScheduleInput_2024_04_15 = {
      name: `non-host-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(nonHost.id, nonHostSchedule);

    const nonHostEventType = await eventTypesRepositoryFixture.create(
      {
        title: `non-host-event-type-${randomString()}`,
        slug: `non-host-event-type-${randomString()}`,
        length: 60,
      },
      nonHost.id
    );

    // Second event type with different length to avoid idempotency key collision
    const nonHostEventType2 = await eventTypesRepositoryFixture.create(
      {
        title: `non-host-event-type-2-${randomString()}`,
        slug: `non-host-event-type-2-${randomString()}`,
        length: 30,
      },
      nonHost.id
    );

    const startTime = new Date(Date.UTC(2030, 0, 10, 13, 0, 0)).toISOString();

    // Book nonHostEventType (60 min) to occupy the nonHost's time slot
    const firstBody: CreateBookingInput_2024_08_13 = {
      start: startTime,
      eventTypeId: nonHostEventType.id,
      attendee: {
        name: "First Attendee",
        email: "first-non-host-attendee@gmail.com",
        timeZone: "Europe/Rome",
        language: "it",
      },
      location: "https://meet.google.com/abc-def-ghi",
    };

    await request(app.getHttpServer())
      .post("/v2/bookings")
      .send(firstBody)
      .set(CAL_API_VERSION_HEADER, VERSION_2026_02_25)
      .expect(201);

    // The authenticated user (host) tries to book nonHostEventType2 with allowConflicts=true.
    // Since host is not the owner/host of nonHostEventType2, allowConflicts should be silently ignored
    // and the booking should fail due to the conflict.
    const conflictingBody: CreateBookingInput_2024_08_13 = {
      start: startTime,
      eventTypeId: nonHostEventType2.id,
      attendee: {
        name: "Conflict Attendee",
        email: "conflict-non-host-attendee@gmail.com",
        timeZone: "Europe/Rome",
        language: "it",
      },
      location: "https://meet.google.com/abc-def-ghi",
      allowConflicts: true,
    };

    await request(app.getHttpServer())
      .post("/v2/bookings")
      .send(conflictingBody)
      .set(CAL_API_VERSION_HEADER, VERSION_2026_02_25)
      .expect(400);

    await bookingsRepositoryFixture.deleteAllBookings(nonHost.id, nonHostEmail);
    await userRepositoryFixture.deleteByEmail(nonHostEmail);
  });

  it("should reject conflicting booking when allowConflicts is not set", async () => {
    const startTime = new Date(Date.UTC(2030, 0, 15, 13, 0, 0)).toISOString();

    // Book eventTypeId (60 min) to occupy the host's time slot
    const firstBody: CreateBookingInput_2024_08_13 = {
      start: startTime,
      eventTypeId,
      attendee: {
        name: "First Attendee",
        email: "first-no-flag-attendee@gmail.com",
        timeZone: "Europe/Rome",
        language: "it",
      },
      location: "https://meet.google.com/abc-def-ghi",
    };

    await request(app.getHttpServer())
      .post("/v2/bookings")
      .send(firstBody)
      .set(CAL_API_VERSION_HEADER, VERSION_2026_02_25)
      .expect(201);

    // Try to book eventTypeId2 (30 min) at the same start time without allowConflicts — should fail
    const conflictingBody: CreateBookingInput_2024_08_13 = {
      start: startTime,
      eventTypeId: eventTypeId2,
      attendee: {
        name: "Conflict Attendee",
        email: "conflict-no-flag-attendee@gmail.com",
        timeZone: "Europe/Rome",
        language: "it",
      },
      location: "https://meet.google.com/abc-def-ghi",
    };

    await request(app.getHttpServer())
      .post("/v2/bookings")
      .send(conflictingBody)
      .set(CAL_API_VERSION_HEADER, VERSION_2026_02_25)
      .expect(400);
  });

  afterAll(async () => {
    await oauthClientRepositoryFixture.delete(oAuthClient.id);
    await teamRepositoryFixture.delete(organization.id);
    await bookingsRepositoryFixture.deleteAllBookings(host.id, host.email);
    await userRepositoryFixture.deleteByEmail(host.email);
    await app.close();
  });
});
