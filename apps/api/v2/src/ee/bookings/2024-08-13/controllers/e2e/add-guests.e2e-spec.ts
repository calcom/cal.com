import {
  CAL_API_VERSION_HEADER,
  ERROR_STATUS,
  SUCCESS_STATUS,
  VERSION_2024_08_13,
} from "@calcom/platform-constants";
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
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { AddGuestsOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/add-guests.output";
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
  guest: TestUser;
  eventTypeId: number;
  bookingUid: string;
};

describe("Bookings Endpoints 2024-08-13 add guests", () => {
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
      name: `user-emails-2024-08-13-organization-${randomString()}`,
    });

    await setupTestData();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  async function setupTestData() {
    const oAuthClient = await createOAuthClient(organization.id, true);

    const organizerUser = await userRepositoryFixture.create({
      email: `user-emails-2024-08-13-organizer-${randomString()}@api.com`,
      platformOAuthClients: {
        connect: { id: oAuthClient.id },
      },
    });

    const unrelatedUserData = await userRepositoryFixture.create({
      email: `user-emails-2024-08-13-unrelated-${randomString()}@api.com`,
      platformOAuthClients: {
        connect: { id: oAuthClient.id },
      },
    });

    const guestUser = await userRepositoryFixture.create({
      email: `user-emails-2024-08-13-guest-${randomString()}@api.com`,
      platformOAuthClients: {
        connect: { id: oAuthClient.id },
      },
    });

    const organizerTokens = await tokensRepositoryFixture.createTokens(organizerUser.id, oAuthClient.id);
    const unrelatedUserTokens = await tokensRepositoryFixture.createTokens(
      unrelatedUserData.id,
      oAuthClient.id
    );
    const guestTokens = await tokensRepositoryFixture.createTokens(guestUser.id, oAuthClient.id);

    const schedule: CreateScheduleInput_2024_04_15 = {
      name: `user-add-guests-2024-08-13-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(organizerUser.id, schedule);

    const eventType = await eventTypesRepositoryFixture.create(
      {
        title: `user-add-guests-2024-08-13-event-type-${randomString()}`,
        slug: `user-add-guests-2024-08-13-event-type-${randomString()}`,
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
      guest: {
        user: guestUser,
        accessToken: guestTokens.accessToken,
        refreshToken: guestTokens.refreshToken,
      },
      eventTypeId: eventType.id,
      bookingUid: "",
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

  describe("POST /v2/bookings/:bookingUid/guests", () => {
    beforeAll(async () => {
      const createBookingBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
        eventTypeId: testSetup.eventTypeId,
        attendee: {
          name: "Mr Proper",
          email: "mr_proper@gmail.com",
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
    });

    describe("Authentication", () => {
      it("should return 401 when adding guests without authentication", async () => {
        const addGuestsBody = {
          guests: [{ email: "unauthenticated.guest@example.com" }],
        };

        const addGuestsResponse = await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/guests`)
          .send(addGuestsBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

        expect(addGuestsResponse.status).toBe(401);
      });
    });

    describe("Authorization - Organizer", () => {
      it("should allow booking organizer to add multiple guests", async () => {
        const addGuestsBody = {
          guests: [{ email: "organizer.guest1@example.com" }, { email: "organizer.guest2@example.com" }],
        };

        const addGuestsResponse = await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/guests`)
          .send(addGuestsBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(200);

        const addGuestsResponseBody: AddGuestsOutput_2024_08_13 = addGuestsResponse.body;

        verifyAddGuestsResponse(
          addGuestsResponseBody,
          ["organizer.guest1@example.com", "organizer.guest2@example.com"],
          true
        );
      });

      it("should return 403 when unrelated user tries to add guests", async () => {
        const addGuestsBody = {
          guests: [
            { email: "non-organizer.guest1@example.com" },
            { email: "non-organizer.guest2@example.com" },
          ],
        };

        await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/guests`)
          .send(addGuestsBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.unrelatedUser.accessToken}`)
          .expect(403);
      });
    });

    describe("Authorization - guest", () => {
      it("should allow organizer to add a user as guest, then guest can add more guests", async () => {
        // Step 1: Organizer adds guest user as a guest
        const addguestBody = {
          guests: [{ email: testSetup.guest.user.email }],
        };

        const addguestResponse = await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/guests`)
          .send(addguestBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(200);

        const addguestResponseBody: AddGuestsOutput_2024_08_13 = addguestResponse.body;

        verifyAddGuestsResponse(addguestResponseBody, [testSetup.guest.user.email], true);

        // Step 2: Now the guest can add their own guests
        const addGuestsBody = {
          guests: [{ email: "guest.guest1@example.com" }],
        };

        const addGuestsResponse = await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/guests`)
          .send(addGuestsBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.guest.accessToken}`)
          .expect(200);

        const addGuestsResponseBody: AddGuestsOutput_2024_08_13 = addGuestsResponse.body;

        verifyAddGuestsResponse(addGuestsResponseBody, ["guest.guest1@example.com"], true);
      });

      it("should return 403 when non-guest user tries to add guests", async () => {
        const addGuestsBody = {
          guests: [{ email: "non-guest.guest1@example.com" }, { email: "non-guest.guest2@example.com" }],
        };

        await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/guests`)
          .send(addGuestsBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.unrelatedUser.accessToken}`)
          .expect(403);
      });
    });

    describe("Validation", () => {
      it("should return 400 when attempting to add duplicate guest email", async () => {
        const addGuestsBody = {
          guests: [{ email: "organizer.guest1@example.com" }],
        };

        const addGuestsResponse = await request(app.getHttpServer())
          .post(`/v2/bookings/${testSetup.bookingUid}/guests`)
          .send(addGuestsBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`);

        expect(addGuestsResponse.status).toEqual(400);
        expect(addGuestsResponse.body.status).toEqual(ERROR_STATUS);
      });
    });
  });

  describe("POST /v2/bookings/:bookingUid/guests - Emails Disabled", () => {
    let emailsDisabledSetup: TestSetup;

    beforeAll(async () => {
      const oAuthClientDisabled = await createOAuthClient(organization.id, false);

      const organizerUser = await userRepositoryFixture.create({
        email: `user-no-emails-2024-08-13-organizer-${randomString()}@api.com`,
        platformOAuthClients: {
          connect: { id: oAuthClientDisabled.id },
        },
      });

      const organizerTokens = await tokensRepositoryFixture.createTokens(
        organizerUser.id,
        oAuthClientDisabled.id
      );

      const schedule: CreateScheduleInput_2024_04_15 = {
        name: `user-no-emails-2024-08-13-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(organizerUser.id, schedule);

      const eventType = await eventTypesRepositoryFixture.create(
        {
          title: `user-no-emails-2024-08-13-event-type-${randomString()}`,
          slug: `user-no-emails-2024-08-13-event-type-${randomString()}`,
          length: 60,
        },
        organizerUser.id
      );

      const createBookingBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 9, 14, 0, 0)).toISOString(),
        eventTypeId: eventType.id,
        attendee: {
          name: "No Email User",
          email: "no.email.user@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
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

      emailsDisabledSetup = {
        organizer: {
          user: organizerUser,
          accessToken: organizerTokens.accessToken,
          refreshToken: organizerTokens.refreshToken,
        },
        unrelatedUser: testSetup.unrelatedUser,
        guest: testSetup.guest,
        eventTypeId: eventType.id,
        bookingUid: createBookingResponseBody.data.uid,
      };
    });

    it("should NOT send emails when adding guests (emails disabled)", async () => {
      attendeeAddGuestsEmailSpy.mockClear();
      organizerAddGuestsEmailSpy.mockClear();
      attendeeScheduledEmailSpy.mockClear();

      const addGuestsBody = {
        guests: [{ email: "no-email.guest1@example.com" }, { email: "no-email.guest2@example.com" }],
      };

      const addGuestsResponse = await request(app.getHttpServer())
        .post(`/v2/bookings/${emailsDisabledSetup.bookingUid}/guests`)
        .send(addGuestsBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${emailsDisabledSetup.organizer.accessToken}`)
        .expect(200);

      const addGuestsResponseBody: AddGuestsOutput_2024_08_13 = addGuestsResponse.body;

      verifyAddGuestsResponse(
        addGuestsResponseBody,
        ["no-email.guest1@example.com", "no-email.guest2@example.com"],
        false
      );
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
    await userRepositoryFixture.deleteByEmail(testSetup.guest.user.email);

    await bookingsRepositoryFixture.deleteAllBookings(
      testSetup.organizer.user.id,
      testSetup.organizer.user.email
    );

    await app.close();
  });

  function responseDataIsBooking(data: unknown): data is BookingOutput_2024_08_13 {
    return !Array.isArray(data) && typeof data === "object" && data !== null && "id" in data;
  }

  function verifyAddGuestsResponse(
    responseBody: AddGuestsOutput_2024_08_13,
    expectedGuestEmails: string[],
    shouldEmailsBeSent: boolean
  ): BookingOutput_2024_08_13 {
    expect(responseBody.status).toEqual(SUCCESS_STATUS);

    if (!responseDataIsBooking(responseBody.data)) {
      throw new Error(
        "Invalid response data - expected booking but received array of possibly recurring bookings"
      );
    }

    const bookingData = responseBody.data;

    expect(bookingData.guests).toBeDefined();
    const guestEmails = bookingData.guests;

    expectedGuestEmails.forEach((email) => {
      expect(guestEmails).toContain(email);
    });

    expect(bookingData.guests).toBeDefined();
    expectedGuestEmails.forEach((email) => {
      expect(bookingData.guests).toContain(email);
    });

    if (shouldEmailsBeSent) {
      expect(attendeeAddGuestsEmailSpy).toHaveBeenCalled();
      expect(organizerAddGuestsEmailSpy).toHaveBeenCalled();
      expect(attendeeScheduledEmailSpy).toHaveBeenCalled();
    } else {
      expect(attendeeAddGuestsEmailSpy).not.toHaveBeenCalled();
      expect(organizerAddGuestsEmailSpy).not.toHaveBeenCalled();
      expect(attendeeScheduledEmailSpy).not.toHaveBeenCalled();
    }

    return bookingData;
  }
});
