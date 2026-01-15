import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_06_14 } from "@calcom/platform-constants";
import {
  ApiSuccessResponse,
  CreateEventTypeInput_2024_06_14,
  EventTypeOutput_2024_06_14,
} from "@calcom/platform-types";
import type { PlatformOAuthClient, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CreateBookingInput_2024_04_15 } from "@/ee/bookings/2024-04-15/inputs/create-booking.input";
import {
  GetBookingsDataEntry,
  GetBookingsOutput_2024_04_15,
} from "@/ee/bookings/2024-04-15/outputs/get-bookings.output";
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

const CLIENT_REDIRECT_URI = "http://localhost:4321";

describe("Managed user bookings 2024-04-15", () => {
  let app: INestApplication;

  let oAuthClient: PlatformOAuthClient;
  let organization: Team;
  let userRepositoryFixture: UserRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let profilesRepositoryFixture: ProfileRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;

  const platformAdminEmail = `managed-users-bookings-admin-${randomString()}@api.com`;
  let platformAdmin: User;

  const managedUsersTimeZone = "Europe/Rome";
  const firstManagedUserEmail = `managed-user-bookings-2024-04-15-first-user@api.com`;
  const secondManagedUserEmail = `managed-user-bookings-2024-04-15-second-user@api.com`;
  const thirdManagedUserEmail = `managed-user-bookings-2024-04-15-third-user@api.com`;

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
      const body: CreateBookingInput_2024_04_15 = {
        start: "2040-05-21T09:30:00.000Z",
        end: "2040-05-21T10:00:00.000Z",
        eventTypeId: firstManagedUserEventTypeId,
        timeZone: "Europe/London",
        language: "en",
        metadata: {},
        hashedLink: "",
        responses: {
          name: secondManagedUser.user.name || "unknown-name",
          email: secondManagedUserEmail,
          location: {
            value: "attendeeInPerson",
            optionValue: "rome",
          },
          notes: "test",
          guests: [],
        },
      };

      await request(app.getHttpServer()).post("/v2/bookings").send(body).expect(201);

      firstManagedUserBookingsCount += 1;
      secondManagedUserBookingsCount += 1;

      const getFirstManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set("Authorization", `Bearer ${firstManagedUser.accessToken}`)
        .expect(200);

      const firstManagedUserBookingsResponseBody: GetBookingsOutput_2024_04_15 =
        getFirstManagedUserBookings.body;
      const firstManagedUserBookings: GetBookingsDataEntry[] =
        firstManagedUserBookingsResponseBody.data.bookings;
      expect(firstManagedUserBookings.length).toEqual(firstManagedUserBookingsCount);

      const getSecondManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set("Authorization", `Bearer ${secondManagedUser.accessToken}`)
        .expect(200);
      const secondManagedUserBookingsResponseBody: GetBookingsOutput_2024_04_15 =
        getSecondManagedUserBookings.body;
      const secondManagedUserBookings: GetBookingsDataEntry[] =
        secondManagedUserBookingsResponseBody.data.bookings;
      expect(secondManagedUserBookings.length).toEqual(secondManagedUserBookingsCount);
    });

    it("managed user should be booked by managed user attendee and managed user as a guest and booking shows up in all three users' bookings", async () => {
      const body: CreateBookingInput_2024_04_15 = {
        start: "2040-05-21T10:30:00.000Z",
        end: "2040-05-21T11:00:00.000Z",
        eventTypeId: firstManagedUserEventTypeId,
        timeZone: "Europe/London",
        language: "en",
        metadata: {},
        hashedLink: "",
        responses: {
          name: thirdManagedUser.user.name || "unknown-name",
          email: thirdManagedUserEmail,
          location: {
            value: "attendeeInPerson",
            optionValue: "rome",
          },
          notes: "test",
          guests: [secondManagedUserEmail],
        },
      };

      await request(app.getHttpServer()).post("/v2/bookings").send(body).expect(201);

      firstManagedUserBookingsCount += 1;
      secondManagedUserBookingsCount += 1;
      thirdManagedUserBookingsCount += 1;

      const getFirstManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set("Authorization", `Bearer ${firstManagedUser.accessToken}`)
        .expect(200);
      const firstManagedUserBookingsResponseBody: GetBookingsOutput_2024_04_15 =
        getFirstManagedUserBookings.body;
      const firstManagedUserBookings: GetBookingsDataEntry[] =
        firstManagedUserBookingsResponseBody.data.bookings;
      expect(firstManagedUserBookings.length).toEqual(firstManagedUserBookingsCount);

      const getSecondManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set("Authorization", `Bearer ${secondManagedUser.accessToken}`)
        .expect(200);
      const secondManagedUserBookingsResponseBody: GetBookingsOutput_2024_04_15 =
        getSecondManagedUserBookings.body;
      const secondManagedUserBookings: GetBookingsDataEntry[] =
        secondManagedUserBookingsResponseBody.data.bookings;
      expect(secondManagedUserBookings.length).toEqual(secondManagedUserBookingsCount);

      const getThirdManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set("Authorization", `Bearer ${thirdManagedUser.accessToken}`)
        .expect(200);
      const thirdManagedUserBookingsResponseBody: GetBookingsOutput_2024_04_15 =
        getThirdManagedUserBookings.body;
      const thirdManagedUserBookings: GetBookingsDataEntry[] =
        thirdManagedUserBookingsResponseBody.data.bookings;
      expect(thirdManagedUserBookings.length).toEqual(thirdManagedUserBookingsCount);
    });
  });

  describe("bookings using OAuth client emails", () => {
    it("managed user should be booked by managed user attendee and booking shows up in both users' bookings", async () => {
      const body: CreateBookingInput_2024_04_15 = {
        start: "2040-05-21T12:00:00.000Z",
        end: "2040-05-21T12:30:00.000Z",
        eventTypeId: firstManagedUserEventTypeId,
        timeZone: "Europe/London",
        language: "en",
        metadata: {},
        hashedLink: "",
        responses: {
          name: secondManagedUser.user.name || "unknown-name",
          email: secondManagedUser.user.email,
          location: {
            value: "attendeeInPerson",
            optionValue: "rome",
          },
          notes: "test",
          guests: [],
        },
      };

      await request(app.getHttpServer()).post("/v2/bookings").send(body).expect(201);

      firstManagedUserBookingsCount += 1;
      secondManagedUserBookingsCount += 1;

      const getFirstManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set("Authorization", `Bearer ${firstManagedUser.accessToken}`)
        .expect(200);

      const firstManagedUserBookingsResponseBody: GetBookingsOutput_2024_04_15 =
        getFirstManagedUserBookings.body;
      const firstManagedUserBookings: GetBookingsDataEntry[] =
        firstManagedUserBookingsResponseBody.data.bookings;
      expect(firstManagedUserBookings.length).toEqual(firstManagedUserBookingsCount);

      const getSecondManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set("Authorization", `Bearer ${secondManagedUser.accessToken}`)
        .expect(200);

      const secondManagedUserBookingsResponseBody: GetBookingsOutput_2024_04_15 =
        getSecondManagedUserBookings.body;
      const secondManagedUserBookings: GetBookingsDataEntry[] =
        secondManagedUserBookingsResponseBody.data.bookings;
      expect(secondManagedUserBookings.length).toEqual(secondManagedUserBookingsCount);
    });

    it("managed user should be booked by managed user attendee and managed user as a guest and booking shows up in all three users' bookings", async () => {
      const body: CreateBookingInput_2024_04_15 = {
        start: "2040-05-21T13:00:00.000Z",
        end: "2040-05-21T13:30:00.000Z",
        eventTypeId: firstManagedUserEventTypeId,
        timeZone: "Europe/London",
        language: "en",
        metadata: {},
        hashedLink: "",
        responses: {
          name: thirdManagedUser.user.name || "unknown-name",
          email: thirdManagedUser.user.email,
          location: {
            value: "attendeeInPerson",
            optionValue: "rome",
          },
          notes: "test",
          guests: [secondManagedUser.user.email],
        },
      };

      await request(app.getHttpServer()).post("/v2/bookings").send(body).expect(201);

      firstManagedUserBookingsCount += 1;
      secondManagedUserBookingsCount += 1;
      thirdManagedUserBookingsCount += 1;

      const getFirstManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set("Authorization", `Bearer ${firstManagedUser.accessToken}`)
        .expect(200);
      const firstManagedUserBookingsResponseBody: GetBookingsOutput_2024_04_15 =
        getFirstManagedUserBookings.body;
      const firstManagedUserBookings: GetBookingsDataEntry[] =
        firstManagedUserBookingsResponseBody.data.bookings;
      expect(firstManagedUserBookings.length).toEqual(firstManagedUserBookingsCount);

      const getSecondManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set("Authorization", `Bearer ${secondManagedUser.accessToken}`)
        .expect(200);
      const secondManagedUserBookingsResponseBody: GetBookingsOutput_2024_04_15 =
        getSecondManagedUserBookings.body;
      const secondManagedUserBookings: GetBookingsDataEntry[] =
        secondManagedUserBookingsResponseBody.data.bookings;
      expect(secondManagedUserBookings.length).toEqual(secondManagedUserBookingsCount);

      const getThirdManagedUserBookings = await request(app.getHttpServer())
        .get("/v2/bookings")
        .set("Authorization", `Bearer ${thirdManagedUser.accessToken}`)
        .expect(200);
      const thirdManagedUserBookingsResponseBody: GetBookingsOutput_2024_04_15 =
        getThirdManagedUserBookings.body;
      const thirdManagedUserBookings: GetBookingsDataEntry[] =
        thirdManagedUserBookingsResponseBody.data.bookings;
      expect(thirdManagedUserBookings.length).toEqual(thirdManagedUserBookingsCount);
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
