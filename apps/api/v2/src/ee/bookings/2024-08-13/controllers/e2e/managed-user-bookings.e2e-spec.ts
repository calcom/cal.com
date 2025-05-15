import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { Locales } from "@/lib/enums/locales";
import {
  CreateManagedUserData,
  CreateManagedUserOutput,
} from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/create-managed-user.output";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { PlatformOAuthClient, Team, User } from "@prisma/client";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { SchedulesRepositoryFixture } from "test/fixtures/repository/schedules.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import {
  CAL_API_VERSION_HEADER,
  SUCCESS_STATUS,
  VERSION_2024_06_14,
  VERSION_2024_08_13,
} from "@calcom/platform-constants";
import {
  ApiSuccessResponse,
  BookingOutput_2024_08_13,
  CreateBookingInput_2024_08_13,
  CreateEventTypeInput_2024_06_14,
  EventTypeOutput_2024_06_14,
  GetBookingsOutput_2024_08_13,
} from "@calcom/platform-types";

const CLIENT_REDIRECT_URI = "http://localhost:4321";

describe("Managed user bookings 2024-08-13", () => {
  let app: INestApplication;

  let oAuthClient: PlatformOAuthClient;
  let organization: Team;
  let userRepositoryFixture: UserRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let schedulesRepositoryFixture: SchedulesRepositoryFixture;
  let profilesRepositoryFixture: ProfileRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;

  const platformAdminEmail = `managed-users-bookings-2024-08-13-admin-${randomString()}@api.com`;
  let platformAdmin: User;

  const managedUsersTimeZone = "Europe/Rome";
  const firstManagedUserEmail = `managed-user-bookings-2024-08-13-first-user-${randomString()}@api.com`;
  const secondManagedUserEmail = `managed-user-bookings-2024-08-13-second-user-${randomString()}@api.com`;
  const thirdManagedUserEmail = `managed-user-bookings-2024-08-13-third-user-${randomString()}@api.com`;

  let firstManagedUser: CreateManagedUserData;
  let secondManagedUser: CreateManagedUserData;
  let thirdManagedUser: CreateManagedUserData;

  let firstManagedUserEventTypeId: number;

  let firstManagedUserBookingsCount = 0;
  let secondManagedUserBookingsCount = 0;
  let thirdManagedUserBookingsCount = 0;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaExceptionFilter, HttpExceptionFilter],
      imports: [AppModule, UsersModule],
    }).compile();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
    schedulesRepositoryFixture = new SchedulesRepositoryFixture(moduleRef);
    profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

    platformAdmin = await userRepositoryFixture.create({ email: platformAdminEmail });

    organization = await teamRepositoryFixture.create({
      name: `oauth-client-users-organization-${randomString()}`,
      isPlatform: true,
      isOrganization: true,
    });
    oAuthClient = await createOAuthClient(organization.id);

    await profilesRepositoryFixture.create({
      uid: "asd1qwwqeqw-asddsadasd",
      username: platformAdminEmail,
      organization: { connect: { id: organization.id } },
      user: {
        connect: { id: platformAdmin.id },
      },
    });

    await membershipsRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: platformAdmin.id } },
      team: { connect: { id: organization.id } },
      accepted: true,
    });

    await app.init();
  });

  async function createOAuthClient(organizationId: number) {
    const data = {
      logo: "logo-url",
      name: "name",
      redirectUris: [CLIENT_REDIRECT_URI],
      permissions: 1023,
    };
    const secret = "secret";

    const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
    return client;
  }

  it(`should create first managed user`, async () => {
    const requestBody: CreateManagedUserInput = {
      email: firstManagedUserEmail,
      timeZone: managedUsersTimeZone,
      weekStart: "Monday",
      timeFormat: 24,
      locale: Locales.FR,
      name: "Alice Smith",
      avatarUrl: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
    };

    const response = await request(app.getHttpServer())
      .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
      .set("x-cal-secret-key", oAuthClient.secret)
      .send(requestBody)
      .expect(201);

    const responseBody: CreateManagedUserOutput = response.body;
    expect(responseBody.status).toEqual(SUCCESS_STATUS);
    expect(responseBody.data).toBeDefined();
    expect(responseBody.data.user.email).toEqual(
      OAuthClientUsersService.getOAuthUserEmail(oAuthClient.id, requestBody.email)
    );
    expect(responseBody.data.accessToken).toBeDefined();
    expect(responseBody.data.refreshToken).toBeDefined();

    firstManagedUser = responseBody.data;
  });

  it("should create an event type for managed user", async () => {
    const body: CreateEventTypeInput_2024_06_14 = {
      title: "Managed user bookings first managed user event type",
      slug: "managed-user-bookings-first-managed-user-event-type",
      description: "Managed user bookings first managed user event type description",
      lengthInMinutes: 30,
    };

    return request(app.getHttpServer())
      .post("/api/v2/event-types")
      .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
      .set("Authorization", `Bearer ${firstManagedUser.accessToken}`)
      .send(body)
      .expect(201)
      .then(async (response) => {
        const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
        const createdEventType = responseBody.data;
        expect(createdEventType).toHaveProperty("id");
        expect(createdEventType.title).toEqual(body.title);
        expect(createdEventType.description).toEqual(body.description);
        expect(createdEventType.lengthInMinutes).toEqual(body.lengthInMinutes);
        expect(createdEventType.ownerId).toEqual(firstManagedUser.user.id);
        firstManagedUserEventTypeId = createdEventType.id;
      });
  });

  it(`should create second managed user`, async () => {
    const requestBody: CreateManagedUserInput = {
      email: secondManagedUserEmail,
      timeZone: managedUsersTimeZone,
      weekStart: "Monday",
      timeFormat: 24,
      locale: Locales.FR,
      name: "Bob Smith",
      avatarUrl: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
    };

    const response = await request(app.getHttpServer())
      .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
      .set("x-cal-secret-key", oAuthClient.secret)
      .send(requestBody)
      .expect(201);

    const responseBody: CreateManagedUserOutput = response.body;
    expect(responseBody.status).toEqual(SUCCESS_STATUS);
    expect(responseBody.data).toBeDefined();
    expect(responseBody.data.user.email).toEqual(
      OAuthClientUsersService.getOAuthUserEmail(oAuthClient.id, requestBody.email)
    );
    expect(responseBody.data.accessToken).toBeDefined();
    expect(responseBody.data.refreshToken).toBeDefined();

    secondManagedUser = responseBody.data;
  });

  it(`should create third managed user`, async () => {
    const requestBody: CreateManagedUserInput = {
      email: thirdManagedUserEmail,
      timeZone: managedUsersTimeZone,
      weekStart: "Monday",
      timeFormat: 24,
      locale: Locales.FR,
      name: "Charlie Smith",
      avatarUrl: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
    };

    const response = await request(app.getHttpServer())
      .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
      .set("x-cal-secret-key", oAuthClient.secret)
      .send(requestBody)
      .expect(201);

    const responseBody: CreateManagedUserOutput = response.body;
    expect(responseBody.status).toEqual(SUCCESS_STATUS);
    expect(responseBody.data).toBeDefined();
    expect(responseBody.data.user.email).toEqual(
      OAuthClientUsersService.getOAuthUserEmail(oAuthClient.id, requestBody.email)
    );
    expect(responseBody.data.accessToken).toBeDefined();
    expect(responseBody.data.refreshToken).toBeDefined();

    thirdManagedUser = responseBody.data;
  });

  describe("bookings using original emails", () => {
    it("managed user should be booked by managed user attendee and booking shows up in both users' bookings", async () => {
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
        eventTypeId: firstManagedUserEventTypeId,
        attendee: {
          name: secondManagedUser.user.name!,
          email: secondManagedUserEmail,
          timeZone: secondManagedUser.user.timeZone,
          language: secondManagedUser.user.locale,
        },
        location: "https://meet.google.com/abc-def-ghi",
      };

      await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      firstManagedUserBookingsCount += 1;
      secondManagedUserBookingsCount += 1;

      const getFirstManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${firstManagedUser.accessToken}`)
        .expect(200);

      const firstManagedUserBookingsResponseBody: GetBookingsOutput_2024_08_13 =
        getFirstManagedUserBookings.body;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const firstManagedUserBookings: BookingOutput_2024_08_13[] = firstManagedUserBookingsResponseBody.data;
      expect(firstManagedUserBookings.length).toEqual(firstManagedUserBookingsCount);

      const getSecondManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${secondManagedUser.accessToken}`)
        .expect(200);

      const secondManagedUserBookingsResponseBody: GetBookingsOutput_2024_08_13 =
        getSecondManagedUserBookings.body;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const secondManagedUserBookings: BookingOutput_2024_08_13[] =
        secondManagedUserBookingsResponseBody.data;
      expect(secondManagedUserBookings.length).toEqual(secondManagedUserBookingsCount);
    });

    it("managed user should be booked by managed user attendee and managed user as a guest and booking shows up in all three users' bookings", async () => {
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 14, 0, 0)).toISOString(),
        eventTypeId: firstManagedUserEventTypeId,
        attendee: {
          name: thirdManagedUser.user.name!,
          email: thirdManagedUserEmail,
          timeZone: thirdManagedUser.user.timeZone,
          language: thirdManagedUser.user.locale,
        },
        guests: [secondManagedUserEmail],
        location: "https://meet.google.com/abc-def-ghi",
      };

      await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      firstManagedUserBookingsCount += 1;
      secondManagedUserBookingsCount += 1;
      thirdManagedUserBookingsCount += 1;

      const getFirstManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${firstManagedUser.accessToken}`)
        .expect(200);

      const firstManagedUserBookingsResponseBody: GetBookingsOutput_2024_08_13 =
        getFirstManagedUserBookings.body;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const firstManagedUserBookings: BookingOutput_2024_08_13[] = firstManagedUserBookingsResponseBody.data;
      expect(firstManagedUserBookings.length).toEqual(firstManagedUserBookingsCount);

      const getSecondManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${secondManagedUser.accessToken}`)
        .expect(200);

      const secondManagedUserBookingsResponseBody: GetBookingsOutput_2024_08_13 =
        getSecondManagedUserBookings.body;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const secondManagedUserBookings: BookingOutput_2024_08_13[] =
        secondManagedUserBookingsResponseBody.data;
      expect(secondManagedUserBookings.length).toEqual(secondManagedUserBookingsCount);

      const getThirdManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${thirdManagedUser.accessToken}`)
        .expect(200);

      const thirdManagedUserBookingsResponseBody: GetBookingsOutput_2024_08_13 =
        getThirdManagedUserBookings.body;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const thirdManagedUserBookings: BookingOutput_2024_08_13[] = thirdManagedUserBookingsResponseBody.data;
      expect(thirdManagedUserBookings.length).toEqual(thirdManagedUserBookingsCount);
    });
  });

  describe("bookings using OAuth client emails", () => {
    it("managed user should be booked by managed user attendee and booking shows up in both users' bookings", async () => {
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 15, 0, 0)).toISOString(),
        eventTypeId: firstManagedUserEventTypeId,
        attendee: {
          name: secondManagedUser.user.name!,
          email: secondManagedUser.user.email,
          timeZone: secondManagedUser.user.timeZone,
          language: secondManagedUser.user.locale,
        },
        location: "https://meet.google.com/abc-def-ghi",
      };

      await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      firstManagedUserBookingsCount += 1;
      secondManagedUserBookingsCount += 1;

      const getFirstManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${firstManagedUser.accessToken}`)
        .expect(200);

      const firstManagedUserBookingsResponseBody: GetBookingsOutput_2024_08_13 =
        getFirstManagedUserBookings.body;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const firstManagedUserBookings: BookingOutput_2024_08_13[] = firstManagedUserBookingsResponseBody.data;
      expect(firstManagedUserBookings.length).toEqual(firstManagedUserBookingsCount);

      const getSecondManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${secondManagedUser.accessToken}`)
        .expect(200);

      const secondManagedUserBookingsResponseBody: GetBookingsOutput_2024_08_13 =
        getSecondManagedUserBookings.body;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const secondManagedUserBookings: BookingOutput_2024_08_13[] =
        secondManagedUserBookingsResponseBody.data;
      expect(secondManagedUserBookings.length).toEqual(secondManagedUserBookingsCount);
    });

    it("managed user should be booked by managed user attendee and managed user as a guest and booking shows up in all three users' bookings", async () => {
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 15, 30, 0)).toISOString(),
        eventTypeId: firstManagedUserEventTypeId,
        attendee: {
          name: thirdManagedUser.user.name!,
          email: thirdManagedUser.user.email,
          timeZone: thirdManagedUser.user.timeZone,
          language: thirdManagedUser.user.locale,
        },
        guests: [secondManagedUser.user.email],
        location: "https://meet.google.com/abc-def-ghi",
      };

      await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      firstManagedUserBookingsCount += 1;
      secondManagedUserBookingsCount += 1;
      thirdManagedUserBookingsCount += 1;

      const getFirstManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${firstManagedUser.accessToken}`)
        .expect(200);

      const firstManagedUserBookingsResponseBody: GetBookingsOutput_2024_08_13 =
        getFirstManagedUserBookings.body;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const firstManagedUserBookings: BookingOutput_2024_08_13[] = firstManagedUserBookingsResponseBody.data;
      expect(firstManagedUserBookings.length).toEqual(firstManagedUserBookingsCount);

      const getSecondManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${secondManagedUser.accessToken}`)
        .expect(200);

      const secondManagedUserBookingsResponseBody: GetBookingsOutput_2024_08_13 =
        getSecondManagedUserBookings.body;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const secondManagedUserBookings: BookingOutput_2024_08_13[] =
        secondManagedUserBookingsResponseBody.data;
      expect(secondManagedUserBookings.length).toEqual(secondManagedUserBookingsCount);

      const getThirdManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${thirdManagedUser.accessToken}`)
        .expect(200);

      const thirdManagedUserBookingsResponseBody: GetBookingsOutput_2024_08_13 =
        getThirdManagedUserBookings.body;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const thirdManagedUserBookings: BookingOutput_2024_08_13[] = thirdManagedUserBookingsResponseBody.data;
      expect(thirdManagedUserBookings.length).toEqual(thirdManagedUserBookingsCount);
    });
  });

  describe("fetch bookings by attendeeEmail", () => {
    it("should return bookings for the original email when original email is attendee only", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/bookings?attendeeEmail=${thirdManagedUserEmail}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${firstManagedUser.accessToken}`)
        .expect(200);

      const thirdManagedUserAttendeeBookingsResponseBody: GetBookingsOutput_2024_08_13 = response.body;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const thirdManagedUserAttendeeBookings: BookingOutput_2024_08_13[] =
        thirdManagedUserAttendeeBookingsResponseBody.data;
      expect(thirdManagedUserBookingsCount).toEqual(2);
      expect(thirdManagedUserAttendeeBookings.length).toEqual(thirdManagedUserBookingsCount);
    });

    it("should return bookings for the oAuth email when original oAuth email is attendee only", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/bookings?attendeeEmail=${thirdManagedUser.user.email}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${firstManagedUser.accessToken}`)
        .expect(200);

      const thirdManagedUserAttendeeBookingsResponseBody: GetBookingsOutput_2024_08_13 = response.body;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const thirdManagedUserAttendeeBookings: BookingOutput_2024_08_13[] =
        thirdManagedUserAttendeeBookingsResponseBody.data;
      expect(thirdManagedUserBookingsCount).toEqual(2);
      expect(thirdManagedUserAttendeeBookings.length).toEqual(thirdManagedUserBookingsCount);
    });

    it("should return bookings for the original email when original email is attendee or guest", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/bookings?attendeeEmail=${secondManagedUserEmail}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${firstManagedUser.accessToken}`)
        .expect(200);

      const secondManagedUserAttendeeBookingsResponseBody: GetBookingsOutput_2024_08_13 = response.body;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const secondManagedUserAttendeeBookings: BookingOutput_2024_08_13[] =
        secondManagedUserAttendeeBookingsResponseBody.data;
      expect(secondManagedUserBookingsCount).toEqual(4);
      expect(secondManagedUserAttendeeBookings.length).toEqual(secondManagedUserBookingsCount);
    });

    it("should return bookings for the oAuth email when original oAuth email is attendee or guest", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/bookings?attendeeEmail=${secondManagedUser.user.email}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${firstManagedUser.accessToken}`)
        .expect(200);

      const secondManagedUserAttendeeBookingsResponseBody: GetBookingsOutput_2024_08_13 = response.body;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const secondManagedUserAttendeeBookings: BookingOutput_2024_08_13[] =
        secondManagedUserAttendeeBookingsResponseBody.data;
      expect(secondManagedUserBookingsCount).toEqual(4);
      expect(secondManagedUserAttendeeBookings.length).toEqual(secondManagedUserBookingsCount);
    });
  });

  afterAll(async () => {
    await userRepositoryFixture.delete(firstManagedUser.user.id);
    await userRepositoryFixture.delete(secondManagedUser.user.id);
    await userRepositoryFixture.delete(thirdManagedUser.user.id);
    await userRepositoryFixture.delete(platformAdmin.id);
    await oauthClientRepositoryFixture.delete(oAuthClient.id);
    await teamRepositoryFixture.delete(organization.id);
    await app.close();
  });
});
