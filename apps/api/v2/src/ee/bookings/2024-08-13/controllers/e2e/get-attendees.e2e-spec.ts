import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import type { BookingOutput_2024_08_13, CreateBookingInput_2024_08_13 } from "@calcom/platform-types";
import type { Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { TokensRepositoryFixture } from "test/fixtures/repository/tokens.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { mockThrottlerGuard } from "test/utils/withNoThrottler";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import {
  GetBookingAttendeeOutput_2024_08_13,
  GetBookingAttendeesOutput_2024_08_13,
} from "@/ee/bookings/2024-08-13/outputs/get-booking-attendees.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

type TestUser = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

type TestSetup = {
  organizer: TestUser;
  unrelatedUser: TestUser;
  eventTypeId: number;
  bookingUid: string;
  bookingId: number;
  attendeeId: number;
};

describe("Bookings Endpoints 2024-08-13 get attendees", () => {
  let app: INestApplication;
  let organization: Team;

  let userRepositoryFixture: UserRepositoryFixture;
  let bookingsRepositoryFixture: BookingsRepositoryFixture;
  let schedulesService: SchedulesService_2024_04_15;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let tokensRepositoryFixture: TokensRepositoryFixture;

  let testSetup: TestSetup;

  beforeAll(async () => {
    mockThrottlerGuard();

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
    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);
    tokensRepositoryFixture = new TokensRepositoryFixture(moduleRef);

    organization = await teamRepositoryFixture.create({
      name: `get-attendees-2024-08-13-organization-${randomString()}`,
    });

    await setupTestData();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  async function setupTestData() {
    const oAuthClient = await createOAuthClient(organization.id);

    const organizerUser = await userRepositoryFixture.create({
      email: `get-attendees-2024-08-13-organizer-${randomString()}@api.com`,
      platformOAuthClients: {
        connect: { id: oAuthClient.id },
      },
    });

    const unrelatedUserData = await userRepositoryFixture.create({
      email: `get-attendees-2024-08-13-unrelated-${randomString()}@api.com`,
      platformOAuthClients: {
        connect: { id: oAuthClient.id },
      },
    });

    const organizerTokens = await tokensRepositoryFixture.createTokens(organizerUser.id, oAuthClient.id);
    const unrelatedUserTokens = await tokensRepositoryFixture.createTokens(
      unrelatedUserData.id,
      oAuthClient.id
    );

    const schedule: CreateScheduleInput_2024_04_15 = {
      name: `get-attendees-2024-08-13-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(organizerUser.id, schedule);

    const eventType = await eventTypesRepositoryFixture.create(
      {
        title: `get-attendees-2024-08-13-event-type-${randomString()}`,
        slug: `get-attendees-2024-08-13-event-type-${randomString()}`,
        length: 60,
      },
      organizerUser.id
    );

    testSetup = {
      organizer: {
        user: organizerUser,
        accessToken: organizerTokens.accessToken,
        refreshToken: organizerTokens.refreshToken,
      },
      unrelatedUser: {
        user: unrelatedUserData,
        accessToken: unrelatedUserTokens.accessToken,
        refreshToken: unrelatedUserTokens.refreshToken,
      },
      eventTypeId: eventType.id,
      bookingUid: "",
      bookingId: 0,
      attendeeId: 0,
    };
  }

  async function createOAuthClient(organizationId: number) {
    const data = {
      logo: "logo-url",
      name: "name",
      redirectUris: ["http://localhost:5555"],
      permissions: 32,
      areEmailsEnabled: true,
    };
    const secret = "secret";

    const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
    return client;
  }

  describe("GET /v2/bookings/:bookingUid/attendees", () => {
    const attendeeEmail = "attendee@example.com";
    const attendeeName = "Test Attendee";
    const attendeeTimeZone = "Europe/Rome";

    beforeAll(async () => {
      const createBookingBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
        eventTypeId: testSetup.eventTypeId,
        attendee: {
          name: attendeeName,
          email: attendeeEmail,
          timeZone: attendeeTimeZone,
          language: "it",
        },
        location: "https://meet.google.com/abc-def-ghi",
        bookingFieldsResponses: {
          customField: "customValue",
        },
        metadata: {
          userId: "100",
        },
      };

      const createBookingResponse = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(createBookingBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      const createBookingResponseBody: CreateBookingOutput_2024_08_13 = createBookingResponse.body;
      expect(createBookingResponseBody.status).toEqual(SUCCESS_STATUS);

      if (!responseDataIsBooking(createBookingResponseBody.data)) {
        throw new Error(
          "Invalid response data - expected booking but received array of possibly recurring bookings"
        );
      }

      testSetup.bookingUid = createBookingResponseBody.data.uid;
      testSetup.bookingId = createBookingResponseBody.data.id;
    });

    describe("Authentication", () => {
      it("should return 401 when getting attendees without authentication", async () => {
        const getAttendeesResponse = await request(app.getHttpServer())
          .get(`/v2/bookings/${testSetup.bookingUid}/attendees`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

        expect(getAttendeesResponse.status).toBe(401);
      });
    });

    describe("Authorization - Organizer", () => {
      it("should allow booking organizer to get attendees", async () => {
        const getAttendeesResponse = await request(app.getHttpServer())
          .get(`/v2/bookings/${testSetup.bookingUid}/attendees`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(200);

        const getAttendeesResponseBody: GetBookingAttendeesOutput_2024_08_13 = getAttendeesResponse.body;

        expect(getAttendeesResponseBody.status).toEqual(SUCCESS_STATUS);
        expect(getAttendeesResponseBody.data).toBeDefined();
        expect(Array.isArray(getAttendeesResponseBody.data)).toBe(true);
        expect(getAttendeesResponseBody.data.length).toBeGreaterThan(0);

        const attendee = getAttendeesResponseBody.data[0];
        expect(attendee.name).toEqual(attendeeName);
        expect(attendee.email).toEqual(attendeeEmail);
        expect(attendee.timeZone).toEqual(attendeeTimeZone);
      });

      it("should return 403 when unrelated user tries to get attendees", async () => {
        await request(app.getHttpServer())
          .get(`/v2/bookings/${testSetup.bookingUid}/attendees`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.unrelatedUser.accessToken}`)
          .expect(403);
      });
    });

    describe("Response format", () => {
      it("should return attendees with correct structure", async () => {
        const getAttendeesResponse = await request(app.getHttpServer())
          .get(`/v2/bookings/${testSetup.bookingUid}/attendees`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(200);

        const getAttendeesResponseBody: GetBookingAttendeesOutput_2024_08_13 = getAttendeesResponse.body;

        expect(getAttendeesResponseBody.status).toEqual(SUCCESS_STATUS);
        expect(getAttendeesResponseBody.data).toBeDefined();

        const attendee = getAttendeesResponseBody.data[0];

        expect(typeof attendee.name).toBe("string");
        expect(typeof attendee.email).toBe("string");
        expect(typeof attendee.timeZone).toBe("string");
      });
    });
  });

  describe("GET /v2/bookings/:bookingUid/attendees/:attendeeId", () => {
    const attendeeEmail = "attendee@example.com";
    const attendeeName = "Test Attendee";
    const attendeeTimeZone = "Europe/Rome";

    beforeAll(async () => {
      // Get attendee ID from database since the list API doesn't return IDs
      const booking = await bookingsRepositoryFixture.getByUidWithAttendees(testSetup.bookingUid);
      if (booking?.attendees?.length) {
        testSetup.attendeeId = booking.attendees[0].id;
      }
    });

    describe("Authentication", () => {
      it("should return 401 when getting single attendee without authentication", async () => {
        const getAttendeeResponse = await request(app.getHttpServer())
          .get(`/v2/bookings/${testSetup.bookingUid}/attendees/${testSetup.attendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

        expect(getAttendeeResponse.status).toBe(401);
      });
    });

    describe("Authorization", () => {
      it("should allow booking organizer to get single attendee", async () => {
        const getAttendeeResponse = await request(app.getHttpServer())
          .get(`/v2/bookings/${testSetup.bookingUid}/attendees/${testSetup.attendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(200);

        const getAttendeeResponseBody: GetBookingAttendeeOutput_2024_08_13 = getAttendeeResponse.body;

        expect(getAttendeeResponseBody.status).toEqual(SUCCESS_STATUS);
        expect(getAttendeeResponseBody.data).toBeDefined();
        expect(getAttendeeResponseBody.data.name).toEqual(attendeeName);
        expect(getAttendeeResponseBody.data.email).toEqual(attendeeEmail);
        expect(getAttendeeResponseBody.data.timeZone).toEqual(attendeeTimeZone);
      });

      it("should return 403 when unrelated user tries to get single attendee", async () => {
        await request(app.getHttpServer())
          .get(`/v2/bookings/${testSetup.bookingUid}/attendees/${testSetup.attendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.unrelatedUser.accessToken}`)
          .expect(403);
      });
    });

    describe("Not found cases", () => {
      it("should return 500 for non-existent attendee ID", async () => {
        const nonExistentAttendeeId = 999999999;
        await request(app.getHttpServer())
          .get(`/v2/bookings/${testSetup.bookingUid}/attendees/${nonExistentAttendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(500);
      });

      it("should return 403 for non-existent booking UID because BookingPbacGuard treats missing bookings as unauthorized", async () => {
        await request(app.getHttpServer())
          .get(`/v2/bookings/non-existent-booking-uid/attendees/${testSetup.attendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(403);
      });
    });

    describe("Response format", () => {
      it("should return single attendee with correct structure", async () => {
        const getAttendeeResponse = await request(app.getHttpServer())
          .get(`/v2/bookings/${testSetup.bookingUid}/attendees/${testSetup.attendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(200);

        const getAttendeeResponseBody: GetBookingAttendeeOutput_2024_08_13 = getAttendeeResponse.body;

        expect(getAttendeeResponseBody.status).toEqual(SUCCESS_STATUS);
        expect(getAttendeeResponseBody.data).toBeDefined();

        expect(Array.isArray(getAttendeeResponseBody.data)).toBe(false);

        const attendee = getAttendeeResponseBody.data;

        expect(typeof attendee.name).toBe("string");
        expect(typeof attendee.email).toBe("string");
        expect(typeof attendee.timeZone).toBe("string");
      });
    });
  });

  afterAll(async () => {
    await teamRepositoryFixture.delete(organization.id);

    await userRepositoryFixture.deleteByEmail(testSetup.organizer.user.email);
    await userRepositoryFixture.deleteByEmail(testSetup.unrelatedUser.user.email);

    await bookingsRepositoryFixture.deleteAllBookings(
      testSetup.organizer.user.id,
      testSetup.organizer.user.email
    );

    await app.close();
  });

  function responseDataIsBooking(data: unknown): data is BookingOutput_2024_08_13 {
    return !Array.isArray(data) && typeof data === "object" && data !== null && "id" in data;
  }
});
