import {
  CAL_API_VERSION_HEADER,
  ERROR_STATUS,
  SUCCESS_STATUS,
  VERSION_2024_08_13,
} from "@calcom/platform-constants";
import { AttendeeCancelledEmail } from "@calcom/platform-libraries/emails";
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
import { AddGuestsOutput_2024_08_13 } from "@/platform/bookings/2024-08-13/outputs/add-guests.output";
import { CreateBookingOutput_2024_08_13 } from "@/platform/bookings/2024-08-13/outputs/create-booking.output";
import { RemoveAttendeeOutput_2024_08_13 } from "@/platform/bookings/2024-08-13/outputs/remove-attendee.output";
import { CreateScheduleInput_2024_04_15 } from "@/platform/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/platform/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/platform/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

const attendeeCancelledEmailSpy = jest
  .spyOn(AttendeeCancelledEmail.prototype, "getHtml")
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
  primaryAttendeeId: number;
  secondaryAttendeeId: number;
};

describe("Bookings Endpoints 2024-08-13 remove attendee", () => {
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
      name: `remove-attendee-2024-08-13-organization-${randomString()}`,
    });

    await setupTestData();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  async function setupTestData() {
    const oAuthClient = await createOAuthClient(organization.id, true);

    const organizerUser = await userRepositoryFixture.create({
      email: `remove-attendee-2024-08-13-organizer-${randomString()}@api.com`,
      platformOAuthClients: {
        connect: { id: oAuthClient.id },
      },
    });

    const unrelatedUserData = await userRepositoryFixture.create({
      email: `remove-attendee-2024-08-13-unrelated-${randomString()}@api.com`,
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
      name: `remove-attendee-2024-08-13-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(organizerUser.id, schedule);

    const eventType = await eventTypesRepositoryFixture.create(
      {
        title: `remove-attendee-2024-08-13-event-type-${randomString()}`,
        slug: `remove-attendee-2024-08-13-event-type-${randomString()}`,
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
      primaryAttendeeId: 0,
      secondaryAttendeeId: 0,
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
    attendeeCancelledEmailSpy.mockClear();
  });

  describe("DELETE /v2/bookings/:bookingUid/attendees/:attendeeId", () => {
    beforeAll(async () => {
      // Create a booking with primary attendee
      const createBookingBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 10, 13, 0, 0)).toISOString(),
        eventTypeId: testSetup.eventTypeId,
        attendee: {
          name: "Primary Attendee",
          email: "primary.attendee@gmail.com",
          timeZone: "Europe/Rome",
          language: "en",
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

      // Get primary attendee ID
      const booking = await bookingsRepositoryFixture.getByUid(testSetup.bookingUid);
      if (!booking) {
        throw new Error("Booking not found");
      }
      const attendees = await bookingsRepositoryFixture.getAttendeesByBookingId(booking.id);
      testSetup.primaryAttendeeId = attendees[0].id;

      // Add a secondary guest that we can remove
      const addGuestsBody = {
        guests: [
          { email: "secondary.guest@example.com", name: "Secondary Guest", timeZone: "America/New_York" },
        ],
      };

      const addGuestsResponse = await request(app.getHttpServer())
        .post(`/v2/bookings/${testSetup.bookingUid}/guests`)
        .send(addGuestsBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
        .expect(200);

      const addGuestsResponseBody: AddGuestsOutput_2024_08_13 = addGuestsResponse.body;
      expect(addGuestsResponseBody.status).toEqual(SUCCESS_STATUS);

      // Get secondary attendee ID
      const updatedAttendees = await bookingsRepositoryFixture.getAttendeesByBookingId(booking.id);
      const secondaryAttendee = updatedAttendees.find((a) => a.email === "secondary.guest@example.com");
      if (!secondaryAttendee) {
        throw new Error("Secondary attendee not found");
      }
      testSetup.secondaryAttendeeId = secondaryAttendee.id;
    });

    async function getAttendeeCountByBookingUid(bookingUid: string): Promise<number> {
      const booking = await bookingsRepositoryFixture.getByUid(bookingUid);
      if (!booking) throw new Error(`Booking ${bookingUid} not found`);
      const attendees = await bookingsRepositoryFixture.getAttendeesByBookingId(booking.id);
      return attendees.length;
    }

    describe("Authentication", () => {
      it("should return 401 when removing attendee without authentication", async () => {
        const removeAttendeeResponse = await request(app.getHttpServer())
          .delete(`/v2/bookings/${testSetup.bookingUid}/attendees/${testSetup.secondaryAttendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

        expect(removeAttendeeResponse.status).toBe(401);

        const attendeeCount = await getAttendeeCountByBookingUid(testSetup.bookingUid);
        expect(attendeeCount).toEqual(2);
      });
    });

    describe("Authorization", () => {
      it("should return 403 when unrelated user tries to remove attendee", async () => {
        await request(app.getHttpServer())
          .delete(`/v2/bookings/${testSetup.bookingUid}/attendees/${testSetup.secondaryAttendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.unrelatedUser.accessToken}`)
          .expect(403);

        const attendeeCount = await getAttendeeCountByBookingUid(testSetup.bookingUid);
        expect(attendeeCount).toEqual(2);
      });
    });

    describe("Validation", () => {
      it("should return 400 when trying to remove primary attendee", async () => {
        const removeAttendeeResponse = await request(app.getHttpServer())
          .delete(`/v2/bookings/${testSetup.bookingUid}/attendees/${testSetup.primaryAttendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`);

        expect(removeAttendeeResponse.status).toEqual(400);
        expect(removeAttendeeResponse.body.status).toEqual(ERROR_STATUS);

        const attendeeCount = await getAttendeeCountByBookingUid(testSetup.bookingUid);
        expect(attendeeCount).toEqual(2);
      });

      it("should return 404 when trying to remove non-existent attendee", async () => {
        const nonExistentAttendeeId = 999999;

        const removeAttendeeResponse = await request(app.getHttpServer())
          .delete(`/v2/bookings/${testSetup.bookingUid}/attendees/${nonExistentAttendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`);

        expect(removeAttendeeResponse.status).toEqual(404);

        const attendeeCount = await getAttendeeCountByBookingUid(testSetup.bookingUid);
        expect(attendeeCount).toEqual(2);
      });

      it("should return 404 when booking does not exist", async () => {
        const nonExistentBookingUid = "non-existent-booking-uid";

        const removeAttendeeResponse = await request(app.getHttpServer())
          .delete(`/v2/bookings/${nonExistentBookingUid}/attendees/${testSetup.secondaryAttendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`);

        expect(removeAttendeeResponse.status).toEqual(404);

        const attendeeCount = await getAttendeeCountByBookingUid(testSetup.bookingUid);
        expect(attendeeCount).toEqual(2);
      });
    });

    describe("Success cases", () => {
      it("should allow organizer to remove secondary attendee", async () => {
        attendeeCancelledEmailSpy.mockClear();

        const attendeeCountBefore = await getAttendeeCountByBookingUid(testSetup.bookingUid);
        expect(attendeeCountBefore).toEqual(2);

        const removeAttendeeResponse = await request(app.getHttpServer())
          .delete(`/v2/bookings/${testSetup.bookingUid}/attendees/${testSetup.secondaryAttendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(200);

        const removeAttendeeResponseBody: RemoveAttendeeOutput_2024_08_13 = removeAttendeeResponse.body;

        expect(removeAttendeeResponseBody.status).toEqual(SUCCESS_STATUS);
        expect(removeAttendeeResponseBody.data.id).toEqual(testSetup.secondaryAttendeeId);
        expect(removeAttendeeResponseBody.data.email).toEqual("secondary.guest@example.com");
        expect(removeAttendeeResponseBody.data.name).toEqual("Secondary Guest");
        expect(removeAttendeeResponseBody.data.timeZone).toEqual("America/New_York");

        // Verify attendee was removed from DB
        const attendeeCountAfter = await getAttendeeCountByBookingUid(testSetup.bookingUid);
        expect(attendeeCountAfter).toEqual(1);

        // Verify the remaining attendee is the primary one
        const booking = await bookingsRepositoryFixture.getByUid(testSetup.bookingUid);
        const remainingAttendees = await bookingsRepositoryFixture.getAttendeesByBookingId(booking!.id);
        expect(remainingAttendees[0].email).toEqual("primary.attendee@gmail.com");

        // Verify email was sent
        expect(attendeeCancelledEmailSpy).toHaveBeenCalled();
      });
    });
  });

  describe("DELETE /v2/bookings/:bookingUid/attendees/:attendeeId - Emails Disabled", () => {
    let emailsDisabledSetup: {
      organizer: TestUser;
      eventTypeId: number;
      bookingUid: string;
      attendeeIdToRemove: number;
    };

    beforeAll(async () => {
      const oAuthClientDisabled = await createOAuthClient(organization.id, false);

      const organizerUser = await userRepositoryFixture.create({
        email: `remove-attendee-no-emails-2024-08-13-organizer-${randomString()}@api.com`,
        platformOAuthClients: {
          connect: { id: oAuthClientDisabled.id },
        },
      });

      const organizerTokens = await tokensRepositoryFixture.createTokens(
        organizerUser.id,
        oAuthClientDisabled.id
      );

      const schedule: CreateScheduleInput_2024_04_15 = {
        name: `remove-attendee-no-emails-2024-08-13-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(organizerUser.id, schedule);

      const eventType = await eventTypesRepositoryFixture.create(
        {
          title: `remove-attendee-no-emails-2024-08-13-event-type-${randomString()}`,
          slug: `remove-attendee-no-emails-2024-08-13-event-type-${randomString()}`,
          length: 60,
        },
        organizerUser.id
      );

      // Create booking
      const createBookingBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 11, 14, 0, 0)).toISOString(),
        eventTypeId: eventType.id,
        attendee: {
          name: "No Email Primary",
          email: "no.email.primary@gmail.com",
          timeZone: "Europe/Rome",
          language: "en",
        },
        location: "https://meet.google.com/no-emails",
        bookingFieldsResponses: {
          customField: "noEmailValue",
        },
        metadata: {
          userId: "200",
        },
      };

      const createBookingResponse = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(createBookingBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      const createBookingResponseBody: CreateBookingOutput_2024_08_13 = createBookingResponse.body;

      if (!responseDataIsBooking(createBookingResponseBody.data)) {
        throw new Error(
          "Invalid response data - expected booking but received array of possibly recurring bookings"
        );
      }

      const bookingUid = createBookingResponseBody.data.uid;

      // Add a guest to remove
      const addGuestsBody = {
        guests: [
          {
            email: "no-email.secondary@example.com",
            name: "No Email Secondary",
            timeZone: "America/New_York",
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/v2/bookings/${bookingUid}/guests`)
        .send(addGuestsBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${organizerTokens.accessToken}`)
        .expect(200);

      // Get secondary attendee ID
      const booking = await bookingsRepositoryFixture.getByUid(bookingUid);
      if (!booking) {
        throw new Error("Booking not found");
      }
      const attendees = await bookingsRepositoryFixture.getAttendeesByBookingId(booking.id);
      const secondaryAttendee = attendees.find((a) => a.email === "no-email.secondary@example.com");
      if (!secondaryAttendee) {
        throw new Error("Secondary attendee not found");
      }

      emailsDisabledSetup = {
        organizer: {
          user: organizerUser,
          accessToken: organizerTokens.accessToken,
          refreshToken: organizerTokens.refreshToken,
        },
        eventTypeId: eventType.id,
        bookingUid,
        attendeeIdToRemove: secondaryAttendee.id,
      };
    });

    it("should NOT send emails when removing attendee (emails disabled)", async () => {
      attendeeCancelledEmailSpy.mockClear();

      const removeAttendeeResponse = await request(app.getHttpServer())
        .delete(
          `/v2/bookings/${emailsDisabledSetup.bookingUid}/attendees/${emailsDisabledSetup.attendeeIdToRemove}`
        )
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${emailsDisabledSetup.organizer.accessToken}`)
        .expect(200);

      const removeAttendeeResponseBody: RemoveAttendeeOutput_2024_08_13 = removeAttendeeResponse.body;

      expect(removeAttendeeResponseBody.status).toEqual(SUCCESS_STATUS);
      expect(removeAttendeeResponseBody.data.email).toEqual("no-email.secondary@example.com");

      // Verify attendee was removed from DB
      const booking = await bookingsRepositoryFixture.getByUid(emailsDisabledSetup.bookingUid);
      const remainingAttendees = await bookingsRepositoryFixture.getAttendeesByBookingId(booking!.id);
      expect(remainingAttendees).toHaveLength(1);
      expect(remainingAttendees[0].email).toEqual("no.email.primary@gmail.com");

      // Verify email was NOT sent
      expect(attendeeCancelledEmailSpy).not.toHaveBeenCalled();
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(emailsDisabledSetup.organizer.user.email);
      await bookingsRepositoryFixture.deleteAllBookings(
        emailsDisabledSetup.organizer.user.id,
        emailsDisabledSetup.organizer.user.email
      );
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
