import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import {
  AttendeeAddGuestsEmail,
  AttendeeScheduledEmail,
  OrganizerAddGuestsEmail,
} from "@calcom/platform-libraries/emails";
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
import { AddAttendeeOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/add-attendee.output";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

const attendeeAddGuestsEmailSpy = jest
  .spyOn(AttendeeAddGuestsEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));
const organizerAddGuestsEmailSpy = jest
  .spyOn(OrganizerAddGuestsEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));
const attendeeScheduledEmailSpy = jest
  .spyOn(AttendeeScheduledEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));

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
};

describe("Bookings Endpoints 2024-08-13 add attendee", () => {
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
      name: `add-attendee-2024-08-13-organization-${randomString()}`,
    });

    await setupTestData();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  async function setupTestData() {
    const oAuthClient = await createOAuthClient(organization.id, true);

    const organizerUser = await userRepositoryFixture.create({
      email: `add-attendee-2024-08-13-organizer-${randomString()}@api.com`,
      platformOAuthClients: {
        connect: { id: oAuthClient.id },
      },
    });

    const unrelatedUserData = await userRepositoryFixture.create({
      email: `add-attendee-2024-08-13-unrelated-${randomString()}@api.com`,
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
      name: `add-attendee-2024-08-13-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(organizerUser.id, schedule);

    const eventType = await eventTypesRepositoryFixture.create(
      {
        title: `add-attendee-2024-08-13-event-type-${randomString()}`,
        slug: `add-attendee-2024-08-13-event-type-${randomString()}`,
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
    };
  }

  async function createOAuthClient(organizationId: number, emailsEnabled: boolean) {
    const data = {
      logo: "logo-url",
      name: "name",
      redirectUris: ["http://localhost:5555"],
      permissions: 32,
      areEmailsEnabled: emailsEnabled,
    };
    const secret = "secret";

    const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
    return client;
  }

  beforeEach(async () => {
    attendeeAddGuestsEmailSpy.mockClear();
    organizerAddGuestsEmailSpy.mockClear();
    attendeeScheduledEmailSpy.mockClear();
  });

  describe("POST /v2/bookings/:bookingUid/attendees", () => {
    beforeAll(async () => {
      const createBookingBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 10, 13, 0, 0)).toISOString(),
        eventTypeId: testSetup.eventTypeId,
        attendee: {
          name: "Original Attendee",
          email: "original.attendee@gmail.com",
          timeZone: "Europe/Rome",
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
      it("should return 401 when adding attendee without authentication", async () => {
        const addAttendeeBody = {
          email: "unauthenticated.attendee@example.com",
          name: "Unauthenticated Attendee",
          timeZone: "Europe/London",
        };

        const response = await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/attendees`)
          .send(addAttendeeBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

        expect(response.status).toBe(401);
      });
    });

    describe("Authorization", () => {
      it("should allow booking organizer to add an attendee", async () => {
        const addAttendeeBody = {
          email: "new.attendee@example.com",
          name: "New Attendee",
          timeZone: "Europe/London",
        };

        const response = await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/attendees`)
          .send(addAttendeeBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(201);

        const responseBody: AddAttendeeOutput_2024_08_13 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data).toBeDefined();
        expect(responseBody.data.email).toEqual(addAttendeeBody.email);
        expect(responseBody.data.name).toEqual(addAttendeeBody.name);
        expect(responseBody.data.timeZone).toEqual(addAttendeeBody.timeZone);
        expect(responseBody.data.bookingId).toEqual(testSetup.bookingId);
        expect(responseBody.data.id).toBeDefined();
      });

      it("should return 403 when unrelated user tries to add attendee", async () => {
        const addAttendeeBody = {
          email: "unauthorized.attendee@example.com",
          name: "Unauthorized Attendee",
          timeZone: "America/New_York",
        };

        await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/attendees`)
          .send(addAttendeeBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.unrelatedUser.accessToken}`)
          .expect(403);
      });
    });

    describe("Response format", () => {
      it("should return attendee with correct structure", async () => {
        const addAttendeeBody = {
          email: "structure.test@example.com",
          name: "Structure Test Attendee",
          timeZone: "Asia/Tokyo",
        };

        const response = await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/attendees`)
          .send(addAttendeeBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(201);

        const responseBody: AddAttendeeOutput_2024_08_13 = response.body;

        expect(responseBody).toHaveProperty("status", SUCCESS_STATUS);
        expect(responseBody).toHaveProperty("data");
        expect(responseBody.data).toHaveProperty("id");
        expect(responseBody.data).toHaveProperty("bookingId");
        expect(responseBody.data).toHaveProperty("name");
        expect(responseBody.data).toHaveProperty("email");
        expect(responseBody.data).toHaveProperty("timeZone");

        expect(typeof responseBody.data.id).toBe("number");
        expect(typeof responseBody.data.bookingId).toBe("number");
        expect(typeof responseBody.data.name).toBe("string");
        expect(typeof responseBody.data.email).toBe("string");
        expect(typeof responseBody.data.timeZone).toBe("string");
      });
    });

    describe("Validation", () => {
      it("should return 400 when email is missing", async () => {
        const addAttendeeBody = {
          name: "No Email Attendee",
          timeZone: "Europe/London",
        };

        await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/attendees`)
          .send(addAttendeeBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(400);
      });

      it("should return 400 when email is invalid", async () => {
        const addAttendeeBody = {
          email: "invalid-email",
          name: "Invalid Email Attendee",
          timeZone: "Europe/London",
        };

        await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/attendees`)
          .send(addAttendeeBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(400);
      });

      it("should return 400 when name is missing", async () => {
        const addAttendeeBody = {
          email: "no.name@example.com",
          timeZone: "Europe/London",
        };

        await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/attendees`)
          .send(addAttendeeBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(400);
      });

      it("should return 400 when timeZone is missing", async () => {
        const addAttendeeBody = {
          email: "no.timezone@example.com",
          name: "No TimeZone Attendee",
        };

        await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/attendees`)
          .send(addAttendeeBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(400);
      });

      it("should return 400 when timeZone is invalid", async () => {
        const addAttendeeBody = {
          email: "invalid.timezone@example.com",
          name: "Invalid TimeZone Attendee",
          timeZone: "Invalid/TimeZone",
        };

        await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/attendees`)
          .send(addAttendeeBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(400);
      });

      it("should return 403 when booking does not exist", async () => {
        const addAttendeeBody = {
          email: "nonexistent.booking@example.com",
          name: "Nonexistent Booking Attendee",
          timeZone: "Europe/London",
        };

        await request(app.getHttpServer())
          .post(`/v2/bookings/non-existent-booking-uid/attendees`)
          .send(addAttendeeBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(403);
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
