import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { DEFAULT_EVENT_TYPES } from "@/ee/event-types/event-types_2024_04_15/constants/constants";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { Locales } from "@/lib/enums/locales";
import { CreateManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/create-managed-user.output";
import { GetManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/get-managed-user.output";
import { GetManagedUsersOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/get-managed-users.output";
import { KeysResponseDto } from "@/modules/oauth-clients/controllers/oauth-flow/responses/KeysResponse.dto";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { SchedulesRepositoryFixture } from "test/fixtures/repository/schedules.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { slugify } from "@calcom/platform-libraries";
import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { PlatformOAuthClient, Team, User } from "@calcom/prisma/client";

const CLIENT_REDIRECT_URI = "http://localhost:4321";

describe("OAuth Client Users Endpoints", () => {
  describe("Not authenticated", () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter],
        imports: [AppModule, UsersModule],
      }).compile();

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    describe("secret header not set", () => {
      it(`/POST`, () => {
        return request(app.getHttpServer())
          .post("/api/v2/oauth-clients/100/users")
          .send({ email: "bob@gmail.com" })
          .expect(401);
      });
    });

    describe("Bearer access token not set", () => {
      it(`/GET/:id`, () => {
        return request(app.getHttpServer()).get("/api/v2/oauth-clients/100/users/200").expect(401);
      });
      it(`/PUT/:id`, () => {
        return request(app.getHttpServer()).patch("/api/v2/oauth-clients/100/users/200").expect(401);
      });
      it(`/DELETE/:id`, () => {
        return request(app.getHttpServer()).delete("/api/v2/oauth-clients/100/users/200").expect(401);
      });
    });

    afterAll(async () => {
      await app.close();
    });
  });

  describe("User Authenticated", () => {
    let app: INestApplication;

    let oAuthClient: PlatformOAuthClient;
    let oAuthClientEventTypesDisabled: PlatformOAuthClient;
    let organization: Team;
    let userRepositoryFixture: UserRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let schedulesRepositoryFixture: SchedulesRepositoryFixture;
    let profilesRepositoryFixture: ProfileRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let postResponseData: CreateManagedUserOutput["data"];
    let postResponseData2: CreateManagedUserOutput["data"];

    const platformAdminEmail = `oauth-client-users-admin-${randomString()}@api.com`;
    let platformAdmin: User;

    const userEmail = `oauth-client-users-user-${randomString(5)}@api.com`;
    const userTimeZone = "Europe/Rome";
    const userEmailTwo = `oauth-client-users-user-2-${randomString(5)}@api.com`;
    const userTimeZoneTwo = "Europe/Rome";
    let postResponseDataTwo: CreateManagedUserOutput["data"];

    const userEmail2 = `oauth-client-users-user2-${randomString()}@api.com`;
    const userTimeZone2 = "America/New_York";

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
      oAuthClientEventTypesDisabled = await createOAuthClient(organization.id, false);

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

    async function createOAuthClient(organizationId: number, areDefaultEventTypesEnabled?: boolean) {
      const data = {
        logo: "logo-url",
        name: "name",
        redirectUris: [CLIENT_REDIRECT_URI],
        permissions: 32,
        areDefaultEventTypesEnabled,
      };
      const secret = "secret";

      const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
      return client;
    }

    it("should be defined", () => {
      expect(oauthClientRepositoryFixture).toBeDefined();
      expect(userRepositoryFixture).toBeDefined();
      expect(oAuthClient).toBeDefined();
    });

    it(`should fail /POST with incorrect timeZone`, async () => {
      const requestBody: CreateManagedUserInput = {
        email: userEmail,
        timeZone: "incorrect-time-zone",
        name: "Alice Smith",
        avatarUrl: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
      };

      await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .send(requestBody)
        .expect(400);
    });

    it(`should fail /POST with incorrect timeFormat`, async () => {
      const requestBody = {
        email: userEmail,
        timeZone: userTimeZone,
        name: "Alice Smith",
        timeFormat: 100,
      };

      await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .send(requestBody)
        .expect(400);
    });

    it(`/POST with default event types`, async () => {
      const requestBody: CreateManagedUserInput = {
        email: userEmail,
        timeZone: userTimeZone,
        weekStart: "Monday",
        timeFormat: 24,
        locale: Locales.FR,
        name: "Alice Smith",
        avatarUrl: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
        bio: "I am a bio",
        metadata: {
          key: "value",
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .send(requestBody)
        .expect(201);

      const responseBody: CreateManagedUserOutput = response.body;

      postResponseData = responseBody.data;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.user.email).toEqual(
        OAuthClientUsersService.getOAuthUserEmail(oAuthClient.id, requestBody.email)
      );
      expect(responseBody.data.user.timeZone).toEqual(requestBody.timeZone);
      expect(responseBody.data.user.name).toEqual(requestBody.name);
      expect(responseBody.data.user.weekStart).toEqual(requestBody.weekStart);
      expect(responseBody.data.user.timeFormat).toEqual(requestBody.timeFormat);
      expect(responseBody.data.user.locale).toEqual(requestBody.locale);
      expect(responseBody.data.user.avatarUrl).toEqual(requestBody.avatarUrl);
      expect(responseBody.data.user.bio).toEqual(requestBody.bio);
      expect(responseBody.data.user.metadata).toEqual(requestBody.metadata);
      const [emailUser, emailDomain] = responseBody.data.user.email.split("@");
      const [domainName, TLD] = emailDomain.split(".");
      expect(responseBody.data.user.username).toEqual(slugify(`${emailUser}-${domainName}-${TLD}`));

      const { accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } = response.body.data;
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(accessTokenExpiresAt).toBeDefined();
      expect(refreshTokenExpiresAt).toBeDefined();

      const jwtService = app.get(JwtService);
      const decodedAccessToken = jwtService.decode(accessToken);
      const decodedRefreshToken = jwtService.decode(refreshToken);

      expect(decodedAccessToken.clientId).toBe(oAuthClient.id);
      expect(decodedAccessToken.ownerId).toBeDefined();
      expect(decodedAccessToken.type).toBe("access_token");
      expect(decodedAccessToken.expiresAt).toBe(new Date(accessTokenExpiresAt).valueOf());
      expect(decodedAccessToken.iat).toBeGreaterThan(0);

      expect(decodedRefreshToken.clientId).toBe(oAuthClient.id);
      expect(decodedRefreshToken.ownerId).toBeDefined();
      expect(decodedRefreshToken.type).toBe("refresh_token");
      expect(decodedRefreshToken.expiresAt).toBe(new Date(refreshTokenExpiresAt).valueOf());
      expect(decodedRefreshToken.iat).toBeGreaterThan(0);

      await userConnectedToOAuth(oAuthClient.id, responseBody.data.user.email, 1);
      await userHasDefaultEventTypes(responseBody.data.user.id);
      await userHasDefaultSchedule(responseBody.data.user.id, responseBody.data.user.defaultScheduleId);
      await userHasOnlyOneSchedule(responseBody.data.user.id);
    });

    it(`/POST with default event types`, async () => {
      const requestBody: CreateManagedUserInput = {
        email: userEmailTwo,
        timeZone: userTimeZoneTwo,
        weekStart: "Monday",
        timeFormat: 24,
        locale: Locales.FR,
        name: "Bob Smith",
        avatarUrl: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
        bio: "I am a bio",
        metadata: {
          key: "value",
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .send(requestBody)
        .expect(201);

      const responseBody: CreateManagedUserOutput = response.body;

      postResponseDataTwo = responseBody.data;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.user.email).toEqual(
        OAuthClientUsersService.getOAuthUserEmail(oAuthClient.id, requestBody.email)
      );
      expect(responseBody.data.user.timeZone).toEqual(requestBody.timeZone);
      expect(responseBody.data.user.name).toEqual(requestBody.name);
      expect(responseBody.data.user.weekStart).toEqual(requestBody.weekStart);
      expect(responseBody.data.user.timeFormat).toEqual(requestBody.timeFormat);
      expect(responseBody.data.user.locale).toEqual(requestBody.locale);
      expect(responseBody.data.user.avatarUrl).toEqual(requestBody.avatarUrl);

      const { accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } = response.body.data;
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(accessTokenExpiresAt).toBeDefined();
      expect(refreshTokenExpiresAt).toBeDefined();

      const jwtService = app.get(JwtService);
      const decodedAccessToken = jwtService.decode(accessToken);
      const decodedRefreshToken = jwtService.decode(refreshToken);

      expect(decodedAccessToken.clientId).toBe(oAuthClient.id);
      expect(decodedAccessToken.ownerId).toBeDefined();
      expect(decodedAccessToken.type).toBe("access_token");
      expect(decodedAccessToken.expiresAt).toBe(new Date(accessTokenExpiresAt).valueOf());
      expect(decodedAccessToken.iat).toBeGreaterThan(0);

      expect(decodedRefreshToken.clientId).toBe(oAuthClient.id);
      expect(decodedRefreshToken.ownerId).toBeDefined();
      expect(decodedRefreshToken.type).toBe("refresh_token");
      expect(decodedRefreshToken.expiresAt).toBe(new Date(refreshTokenExpiresAt).valueOf());
      expect(decodedRefreshToken.iat).toBeGreaterThan(0);

      await userConnectedToOAuth(oAuthClient.id, responseBody.data.user.email, 2);
      await userHasDefaultEventTypes(responseBody.data.user.id);
      await userHasDefaultSchedule(responseBody.data.user.id, responseBody.data.user.defaultScheduleId);
      await userHasOnlyOneSchedule(responseBody.data.user.id);
    });

    it(`/POST without default event types`, async () => {
      const requestBody: CreateManagedUserInput = {
        email: userEmail2,
        timeZone: userTimeZone2,
        weekStart: "Monday",
        timeFormat: 24,
        locale: Locales.FR,
        name: "Alice Smith",
        avatarUrl: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
        bio: "I am a bio",
        metadata: {
          key: "value",
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${oAuthClientEventTypesDisabled.id}/users`)
        .set("x-cal-secret-key", oAuthClientEventTypesDisabled.secret)
        .send(requestBody)
        .expect(201);

      const responseBody: CreateManagedUserOutput = response.body;

      postResponseData2 = responseBody.data;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.user.email).toEqual(
        OAuthClientUsersService.getOAuthUserEmail(oAuthClientEventTypesDisabled.id, requestBody.email)
      );
      expect(responseBody.data.user.timeZone).toEqual(requestBody.timeZone);
      expect(responseBody.data.user.name).toEqual(requestBody.name);
      expect(responseBody.data.user.weekStart).toEqual(requestBody.weekStart);
      expect(responseBody.data.user.timeFormat).toEqual(requestBody.timeFormat);
      expect(responseBody.data.user.locale).toEqual(requestBody.locale);
      expect(responseBody.data.user.avatarUrl).toEqual(requestBody.avatarUrl);

      const { accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } = response.body.data;
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(accessTokenExpiresAt).toBeDefined();
      expect(refreshTokenExpiresAt).toBeDefined();

      const jwtService = app.get(JwtService);
      const decodedAccessToken = jwtService.decode(accessToken);
      const decodedRefreshToken = jwtService.decode(refreshToken);

      expect(decodedAccessToken.clientId).toBe(oAuthClientEventTypesDisabled.id);
      expect(decodedAccessToken.ownerId).toBeDefined();
      expect(decodedAccessToken.type).toBe("access_token");
      expect(decodedAccessToken.expiresAt).toBe(new Date(accessTokenExpiresAt).valueOf());
      expect(decodedAccessToken.iat).toBeGreaterThan(0);

      expect(decodedRefreshToken.clientId).toBe(oAuthClientEventTypesDisabled.id);
      expect(decodedRefreshToken.ownerId).toBeDefined();
      expect(decodedRefreshToken.type).toBe("refresh_token");
      expect(decodedRefreshToken.expiresAt).toBe(new Date(refreshTokenExpiresAt).valueOf());
      expect(decodedRefreshToken.iat).toBeGreaterThan(0);

      await userConnectedToOAuth(oAuthClientEventTypesDisabled.id, responseBody.data.user.email, 1);
      await userDoesNotHaveDefaultEventTypes(responseBody.data.user.id);
      await userHasDefaultSchedule(responseBody.data.user.id, responseBody.data.user.defaultScheduleId);
      await userHasOnlyOneSchedule(responseBody.data.user.id);
    });

    async function userConnectedToOAuth(oAuthClientId: string, userEmail: string, usersCount: number) {
      const oAuthUsers = await oauthClientRepositoryFixture.getUsers(oAuthClientId);
      const newOAuthUser = oAuthUsers?.find((user) => user.email === userEmail);

      expect(oAuthUsers?.length).toEqual(usersCount);
      expect(newOAuthUser?.email).toEqual(userEmail);
    }

    async function userHasDefaultEventTypes(userId: number) {
      const defaultEventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(userId);

      // note(Lauris): to determine count see default event types created in EventTypesService.createUserDefaultEventTypes
      expect(defaultEventTypes?.length).toEqual(4);
      expect(
        defaultEventTypes?.find((eventType) => eventType.slug === DEFAULT_EVENT_TYPES.thirtyMinutes.slug)
      ).toBeTruthy();
      expect(
        defaultEventTypes?.find((eventType) => eventType.slug === DEFAULT_EVENT_TYPES.sixtyMinutes.slug)
      ).toBeTruthy();
      expect(
        defaultEventTypes?.find((eventType) => eventType.slug === DEFAULT_EVENT_TYPES.thirtyMinutesVideo.slug)
      ).toBeTruthy();
      expect(
        defaultEventTypes?.find((eventType) => eventType.slug === DEFAULT_EVENT_TYPES.sixtyMinutesVideo.slug)
      ).toBeTruthy();
    }

    async function userDoesNotHaveDefaultEventTypes(userId: number) {
      const defaultEventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(userId);
      expect(defaultEventTypes?.length).toEqual(0);
    }

    async function userHasDefaultSchedule(userId: number, scheduleId: number | null) {
      expect(scheduleId).toBeDefined();
      expect(scheduleId).not.toBeNull();

      const user = await userRepositoryFixture.get(userId);
      expect(user?.defaultScheduleId).toEqual(scheduleId);

      const schedule = scheduleId ? await schedulesRepositoryFixture.getById(scheduleId) : null;
      expect(schedule?.userId).toEqual(userId);
    }

    async function userHasOnlyOneSchedule(userId: number) {
      const schedules = await schedulesRepositoryFixture.getByUserId(userId);
      expect(schedules?.length).toEqual(1);
    }

    it(`should fail /POST using already used managed user email`, async () => {
      const requestBody: CreateManagedUserInput = {
        email: userEmail,
        timeZone: userTimeZone,
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
        .expect(409);

      const responseBody: CreateManagedUserOutput = response.body;
      const error = responseBody.error;
      expect(error).toBeDefined();
      expect(error?.message).toEqual(
        `User with the provided e-mail already exists. Existing user ID=${postResponseData.user.id}`
      );
    });

    it(`/GET: return list of managed users`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/oauth-clients/${oAuthClient.id}/users?limit=10&offset=0`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .set("Origin", `${CLIENT_REDIRECT_URI}`)
        .expect(200);

      const responseBody: GetManagedUsersOutput = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toBeGreaterThan(0);
      expect(responseBody.data[0].email).toEqual(postResponseData.user.email);
      expect(responseBody.data[0].name).toEqual(postResponseData.user.name);
      expect(responseBody.data?.length).toEqual(2);
      const userOne = responseBody.data.find((user) => user.email === postResponseData.user.email);
      const userTwo = responseBody.data.find((user) => user.email === postResponseDataTwo.user.email);
      expect(userOne?.email).toEqual(postResponseData.user.email);
      expect(userOne?.name).toEqual(postResponseData.user.name);
      expect(userTwo?.email).toEqual(postResponseDataTwo.user.email);
      expect(userTwo?.name).toEqual(postResponseDataTwo.user.name);
      expect(userOne?.bio).toEqual(postResponseData.user.bio);
      expect(userOne?.metadata).toEqual(postResponseData.user.metadata);
      expect(userTwo?.bio).toEqual(postResponseDataTwo.user.bio);
      expect(userTwo?.metadata).toEqual(postResponseDataTwo.user.metadata);
    });

    it(`/GET: managed user by original email`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/oauth-clients/${oAuthClient.id}/users?limit=10&offset=0&emails=${userEmail}`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .set("Origin", `${CLIENT_REDIRECT_URI}`)
        .expect(200);

      const responseBody: GetManagedUsersOutput = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(1);
      const userOne = responseBody.data.find((user) => user.email === postResponseData.user.email);
      expect(userOne?.email).toEqual(postResponseData.user.email);
      expect(userOne?.name).toEqual(postResponseData.user.name);
      expect(userOne?.bio).toEqual(postResponseData.user.bio);
      expect(userOne?.metadata).toEqual(postResponseData.user.metadata);
    });

    it(`/GET: managed users by original emails`, async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/api/v2/oauth-clients/${oAuthClient.id}/users?limit=10&offset=0&emails=${userEmail},${userEmailTwo}`
        )
        .set("x-cal-secret-key", oAuthClient.secret)
        .set("Origin", `${CLIENT_REDIRECT_URI}`)
        .expect(200);

      const responseBody: GetManagedUsersOutput = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(2);
      const userOne = responseBody.data.find((user) => user.email === postResponseData.user.email);
      const userTwo = responseBody.data.find((user) => user.email === postResponseDataTwo.user.email);
      expect(userOne?.email).toEqual(postResponseData.user.email);
      expect(userOne?.name).toEqual(postResponseData.user.name);
      expect(userTwo?.email).toEqual(postResponseDataTwo.user.email);
      expect(userTwo?.name).toEqual(postResponseDataTwo.user.name);
      expect(userOne?.bio).toEqual(postResponseData.user.bio);
      expect(userOne?.metadata).toEqual(postResponseData.user.metadata);
      expect(userTwo?.bio).toEqual(postResponseDataTwo.user.bio);
      expect(userTwo?.metadata).toEqual(postResponseDataTwo.user.metadata);
    });

    it(`/GET: managed user by oAuth email`, async () => {
      const response = await request(app.getHttpServer())
        // note(Lauris): we use encodeURIComponent because email stored on our side includes "+" which without encoding becomes an empty space.
        .get(
          `/api/v2/oauth-clients/${oAuthClient.id}/users?limit=10&offset=0&emails=${encodeURIComponent(
            postResponseData.user.email
          )}`
        )
        .set("x-cal-secret-key", oAuthClient.secret)
        .set("Origin", `${CLIENT_REDIRECT_URI}`)
        .expect(200);

      const responseBody: GetManagedUsersOutput = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(1);
      const userOne = responseBody.data.find((user) => user.email === postResponseData.user.email);
      expect(userOne?.email).toEqual(postResponseData.user.email);
      expect(userOne?.name).toEqual(postResponseData.user.name);
      expect(userOne?.bio).toEqual(postResponseData.user.bio);
      expect(userOne?.metadata).toEqual(postResponseData.user.metadata);
    });

    it(`should error /GET if managed user email is invalid`, async () => {
      const invalidEmail = "invalid-email";
      const response = await request(app.getHttpServer())
        .get(`/api/v2/oauth-clients/${oAuthClient.id}/users?limit=10&offset=0&emails=${invalidEmail}`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .set("Origin", `${CLIENT_REDIRECT_URI}`)
        .expect(400);

      expect(response.body?.error?.message).toEqual(`Invalid email ${invalidEmail}`);
    });

    it(`/GET: managed users by oAuth emails`, async () => {
      const response = await request(app.getHttpServer())
        // note(Lauris): we use encodeURIComponent because email stored on our side includes "+" which without encoding becomes an empty space.
        .get(
          `/api/v2/oauth-clients/${oAuthClient.id}/users?limit=10&offset=0&emails=${encodeURIComponent(
            postResponseData.user.email
          )},${encodeURIComponent(postResponseDataTwo.user.email)}`
        )
        .set("x-cal-secret-key", oAuthClient.secret)
        .set("Origin", `${CLIENT_REDIRECT_URI}`)
        .expect(200);

      const responseBody: GetManagedUsersOutput = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(2);
      const userOne = responseBody.data.find((user) => user.email === postResponseData.user.email);
      const userTwo = responseBody.data.find((user) => user.email === postResponseDataTwo.user.email);
      expect(userOne?.email).toEqual(postResponseData.user.email);
      expect(userOne?.name).toEqual(postResponseData.user.name);
      expect(userTwo?.email).toEqual(postResponseDataTwo.user.email);
      expect(userTwo?.name).toEqual(postResponseDataTwo.user.name);
      expect(userOne?.bio).toEqual(postResponseData.user.bio);
      expect(userOne?.metadata).toEqual(postResponseData.user.metadata);
      expect(userTwo?.bio).toEqual(postResponseDataTwo.user.bio);
      expect(userTwo?.metadata).toEqual(postResponseDataTwo.user.metadata);
    });

    it(`/GET/:id`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/oauth-clients/${oAuthClient.id}/users/${postResponseData.user.id}`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .set("Origin", `${CLIENT_REDIRECT_URI}`)
        .expect(200);

      const responseBody: GetManagedUserOutput = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.email).toEqual(
        OAuthClientUsersService.getOAuthUserEmail(oAuthClient.id, userEmail)
      );
      expect(responseBody.data.name).toEqual(postResponseData.user.name);
      expect(responseBody.data.bio).toEqual(postResponseData.user.bio);
      expect(responseBody.data.metadata).toEqual(postResponseData.user.metadata);
    });

    it(`/PATCH/:id`, async () => {
      const userUpdatedEmail = "pineapple-pizza@gmail.com";
      const body: UpdateManagedUserInput = { email: userUpdatedEmail, locale: Locales.PT_BR };

      const response = await request(app.getHttpServer())
        .patch(`/api/v2/oauth-clients/${oAuthClient.id}/users/${postResponseData.user.id}`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .set("Origin", `${CLIENT_REDIRECT_URI}`)
        .send(body)
        .expect(200);

      const responseBody: ApiSuccessResponse<Omit<User, "password">> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.email).toEqual(
        OAuthClientUsersService.getOAuthUserEmail(oAuthClient.id, userUpdatedEmail)
      );
      expect(responseBody.data.name).toEqual(postResponseData.user.name);
      expect(responseBody.data.bio).toEqual(postResponseData.user.bio);
      expect(responseBody.data.metadata).toEqual(postResponseData.user.metadata);
      const [emailUser, emailDomain] = responseBody.data.email.split("@");
      const [domainName, TLD] = emailDomain.split(".");
      expect(responseBody.data.username).toEqual(slugify(`${emailUser}-${domainName}-${TLD}`));
      expect(responseBody.data.locale).toEqual(Locales.PT_BR);

      const profile = await profilesRepositoryFixture.findByOrgIdUserId(
        organization.id,
        responseBody.data.id
      );
      expect(profile).toBeDefined();
      expect(profile?.username).toEqual(responseBody.data.username);
    });

    it("should force refresh tokens", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${oAuthClient.id}/users/${postResponseData.user.id}/force-refresh`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .expect(200);

      const responseBody: KeysResponseDto = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.accessToken).toBeDefined();
      expect(responseBody.data.accessTokenExpiresAt).toBeDefined();

      const { accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } = response.body.data;
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(accessTokenExpiresAt).toBeDefined();
      expect(refreshTokenExpiresAt).toBeDefined();

      const jwtService = app.get(JwtService);
      const decodedAccessToken = jwtService.decode(accessToken);
      const decodedRefreshToken = jwtService.decode(refreshToken);

      expect(decodedAccessToken.clientId).toBe(oAuthClient.id);
      expect(decodedAccessToken.ownerId).toBe(postResponseData.user.id);
      expect(decodedAccessToken.type).toBe("access_token");
      expect(decodedAccessToken.expiresAt).toBe(new Date(accessTokenExpiresAt).valueOf());
      expect(decodedAccessToken.iat).toBeGreaterThan(0);

      expect(decodedRefreshToken.clientId).toBe(oAuthClient.id);
      expect(decodedRefreshToken.ownerId).toBe(postResponseData.user.id);
      expect(decodedRefreshToken.type).toBe("refresh_token");
      expect(decodedRefreshToken.expiresAt).toBe(new Date(refreshTokenExpiresAt).valueOf());
      expect(decodedRefreshToken.iat).toBeGreaterThan(0);
    });

    it(`/DELETE/:id`, () => {
      return request(app.getHttpServer())
        .delete(`/api/v2/oauth-clients/${oAuthClient.id}/users/${postResponseData.user.id}`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .set("Origin", `${CLIENT_REDIRECT_URI}`)
        .expect(200);
    });

    describe("managed user time zone", () => {
      describe("negative tests", () => {
        it("should not allow '' time zone", async () => {
          const requestBody = {
            email: "whatever2@gmail.com",
            timeZone: "",
            name: "Bob Smithson",
          };

          await request(app.getHttpServer())
            .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
            .set("x-cal-secret-key", oAuthClient.secret)
            .send(requestBody)
            .expect(400);
        });

        it("should not allow 'invalid-timezone' time zone", async () => {
          const requestBody = {
            email: "whatever2@gmail.com",
            timeZone: "invalid-timezone",
            name: "Bob Smithson",
          };

          await request(app.getHttpServer())
            .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
            .set("x-cal-secret-key", oAuthClient.secret)
            .send(requestBody)
            .expect(400);
        });
      });

      describe("positive tests", () => {
        it("should allow null timezone", async () => {
          const requestBody = {
            email: "whatever1@gmail.com",
            timeZone: null,
            name: "Bob Smithson",
          };

          const response = await request(app.getHttpServer())
            .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
            .set("x-cal-secret-key", oAuthClient.secret)
            .send(requestBody)
            .expect(201);

          const responseBody: CreateManagedUserOutput = response.body;
          expect(responseBody.data.user.timeZone).toEqual("Europe/London");
          await userRepositoryFixture.delete(responseBody.data.user.id);
        });

        it("should allow undefined time zone", async () => {
          const requestBody = {
            email: "whatever3@gmail.com",
            timeZone: undefined,
            name: "Bob Smithson",
          };

          const response = await request(app.getHttpServer())
            .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
            .set("x-cal-secret-key", oAuthClient.secret)
            .send(requestBody)
            .expect(201);

          const responseBody: CreateManagedUserOutput = response.body;
          expect(responseBody.data.user.timeZone).toEqual("Europe/London");
          await userRepositoryFixture.delete(responseBody.data.user.id);
        });

        it("should allow valid time zone", async () => {
          const requestBody = {
            email: "whatever4@gmail.com",
            timeZone: "Europe/Rome",
            name: "Bob Smithson",
          };

          const response = await request(app.getHttpServer())
            .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
            .set("x-cal-secret-key", oAuthClient.secret)
            .send(requestBody)
            .expect(201);

          const responseBody: CreateManagedUserOutput = response.body;
          expect(responseBody.data.user.timeZone).toBe("Europe/Rome");
          await userRepositoryFixture.delete(responseBody.data.user.id);
        });

        it("should allow without any time zone", async () => {
          const requestBody = {
            email: "whatever5@gmail.com",
            name: "Bob Smithson",
          };

          const response = await request(app.getHttpServer())
            .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
            .set("x-cal-secret-key", oAuthClient.secret)
            .send(requestBody)
            .expect(201);

          const responseBody: CreateManagedUserOutput = response.body;
          expect(responseBody.data.user.timeZone).toEqual("Europe/London");
          await userRepositoryFixture.delete(responseBody.data.user.id);
        });
      });
    });

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await oauthClientRepositoryFixture.delete(oAuthClientEventTypesDisabled.id);
      await teamRepositoryFixture.delete(organization.id);
      try {
        await userRepositoryFixture.delete(postResponseData.user.id);
      } catch (e) {
        console.log(e);
      }
      try {
        await userRepositoryFixture.delete(postResponseData2.user.id);
      } catch (e) {
        console.log(e);
      }
      try {
        await userRepositoryFixture.delete(platformAdmin.id);
      } catch (e) {
        console.log(e);
      }
      await app.close();
    });
  });

  describe("User team even-types", () => {
    let app: INestApplication;

    let oAuthClient1: PlatformOAuthClient;
    let oAuthClient2: PlatformOAuthClient;

    let organization: Team;
    let team1: Team;
    let team2: Team;
    let owner: User;

    let userRepositoryFixture: UserRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let postResponseData: CreateManagedUserOutput["data"];

    const userEmail = `oauth-client-users-user-${randomString(5)}@api.com`;
    const userTimeZone = "Europe/Rome";

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
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      organization = await teamRepositoryFixture.create({
        name: `oauth-client-users-organization-${randomString()}`,
        isPlatform: true,
        isOrganization: true,
      });

      owner = await userRepositoryFixture.create({
        email: `oauth-client-users-admin-${randomString()}@api.com`,
        username: `oauth-client-users-admin-${randomString()}@api.com`,
        organization: { connect: { id: organization.id } },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${owner.id}`,
        username: `oauth-client-users-admin-${randomString()}@api.com`,
        organization: {
          connect: {
            id: organization.id,
          },
        },
        user: {
          connect: {
            id: owner.id,
          },
        },
      });

      await membershipsRepositoryFixture.create({
        role: "OWNER",
        user: { connect: { id: owner.id } },
        team: { connect: { id: organization.id } },
        accepted: true,
      });

      oAuthClient1 = await createOAuthClient(organization.id);
      oAuthClient2 = await createOAuthClient(organization.id);

      team1 = await teamRepositoryFixture.create({
        name: "Testy org team",
        isOrganization: false,
        parent: { connect: { id: organization.id } },
        createdByOAuthClient: { connect: { id: oAuthClient1.id } },
      });

      team2 = await teamRepositoryFixture.create({
        name: "Testy org team 2",
        isOrganization: false,
        parent: { connect: { id: organization.id } },
        createdByOAuthClient: { connect: { id: oAuthClient2.id } },
      });

      // note(Lauris): team1 team event-types
      await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: team1.id },
        },
        title: "Collective Event Type",
        slug: "collective-event-type",
        length: 30,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "MANAGED",
        team: {
          connect: { id: team1.id },
        },
        title: "Managed Event Type",
        slug: "managed-event-type",
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      // note(Lauris): team2 team event-types
      await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: team2.id },
        },
        title: "Collective Event Type team 2",
        slug: "collective-event-type-team-2",
        length: 30,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "MANAGED",
        team: {
          connect: { id: team2.id },
        },
        title: "Managed Event Type team 2",
        slug: "managed-event-type-team-2",
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      await app.init();
    });

    async function createOAuthClient(organizationId: number) {
      const data = {
        logo: "logo-url",
        name: "name",
        redirectUris: [CLIENT_REDIRECT_URI],
        permissions: 32,
      };
      const secret = "secret";

      const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
      return client;
    }

    it("should be defined", () => {
      expect(oauthClientRepositoryFixture).toBeDefined();
      expect(userRepositoryFixture).toBeDefined();
      expect(oAuthClient1).toBeDefined();
    });

    it(`should create managed user and update team event-types`, async () => {
      const requestBody: CreateManagedUserInput = {
        email: userEmail,
        timeZone: userTimeZone,
        weekStart: "Monday",
        timeFormat: 24,
        locale: Locales.FR,
        name: "Alice Smith",
        avatarUrl: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${oAuthClient1.id}/users`)
        .set("x-cal-secret-key", oAuthClient1.secret)
        .send(requestBody)
        .expect(201);

      const responseBody: CreateManagedUserOutput = response.body;
      postResponseData = responseBody.data;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();

      await teamHasCorrectEventTypes(team1.id);
      expect(responseBody.data.user.name).toEqual(requestBody.name);
    });

    async function teamHasCorrectEventTypes(teamId: number) {
      const eventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(teamId);
      expect(eventTypes?.length).toEqual(2);
    }

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient1.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.delete(owner.id);
      try {
        await userRepositoryFixture.delete(postResponseData.user.id);
      } catch (e) {
        console.log(e);
      }
      await app.close();
    });
  });
});
