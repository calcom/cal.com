import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { DEFAULT_EVENT_TYPES } from "@/ee/event-types/event-types_2024_04_15/constants/constants";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { Locales } from "@/lib/enums/locales";
import {
  CreateUserResponse,
  UserReturned,
} from "@/modules/oauth-clients/controllers/oauth-client-users/oauth-client-users.controller";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { PlatformOAuthClient, Team, User, EventType } from "@prisma/client";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { SchedulesRepositoryFixture } from "test/fixtures/repository/schedules.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiSuccessResponse } from "@calcom/platform-types";

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
    let organization: Team;
    let userRepositoryFixture: UserRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let schedulesRepositoryFixture: SchedulesRepositoryFixture;
    let profilesRepositoryFixture: ProfileRepositoryFixture;

    let postResponseData: CreateUserResponse;

    const platformAdminEmail = "platform-sensei@mail.com";
    let platformAdmin: User;

    const userEmail = "oauth-client-user@gmail.com";
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
      schedulesRepositoryFixture = new SchedulesRepositoryFixture(moduleRef);
      profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);

      platformAdmin = await userRepositoryFixture.create({ email: platformAdminEmail });

      organization = await teamRepositoryFixture.create({ name: "organization" });
      oAuthClient = await createOAuthClient(organization.id);

      await profilesRepositoryFixture.create({
        uid: "asd-asd",
        username: userEmail,
        user: { connect: { id: platformAdmin.id } },
        organization: { connect: { id: organization.id } },
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
      expect(oAuthClient).toBeDefined();
    });

    it(`should fail /POST with incorrect timeZone`, async () => {
      const requestBody: CreateManagedUserInput = {
        email: userEmail,
        timeZone: "incorrect-time-zone",
      };

      await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .send(requestBody)
        .expect(400);
    });

    it(`/POST`, async () => {
      const requestBody: CreateManagedUserInput = {
        email: userEmail,
        timeZone: userTimeZone,
        weekStart: "Monday",
        timeFormat: 24,
        locale: Locales.FR,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .send(requestBody)
        .expect(201);

      const responseBody: ApiSuccessResponse<{
        user: Omit<User, "password">;
        accessToken: string;
        refreshToken: string;
      }> = response.body;

      postResponseData = responseBody.data;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.user.email).toEqual(getOAuthUserEmail(oAuthClient.id, requestBody.email));
      expect(responseBody.data.user.timeZone).toEqual(requestBody.timeZone);
      expect(responseBody.data.user.weekStart).toEqual(requestBody.weekStart);
      expect(responseBody.data.user.timeFormat).toEqual(requestBody.timeFormat);
      expect(responseBody.data.user.locale).toEqual(requestBody.locale);
      expect(responseBody.data.accessToken).toBeDefined();
      expect(responseBody.data.refreshToken).toBeDefined();

      await userConnectedToOAuth(responseBody.data.user.email);
      await userHasDefaultEventTypes(responseBody.data.user.id);
      await userHasDefaultSchedule(responseBody.data.user.id, responseBody.data.user.defaultScheduleId);
    });

    async function userConnectedToOAuth(userEmail: string) {
      const oAuthUsers = await oauthClientRepositoryFixture.getUsers(oAuthClient.id);
      const newOAuthUser = oAuthUsers?.find((user) => user.email === userEmail);

      expect(oAuthUsers?.length).toEqual(1);
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

    async function userHasDefaultSchedule(userId: number, scheduleId: number | null) {
      expect(scheduleId).toBeDefined();
      expect(scheduleId).not.toBeNull();

      const user = await userRepositoryFixture.get(userId);
      expect(user?.defaultScheduleId).toEqual(scheduleId);

      const schedule = scheduleId ? await schedulesRepositoryFixture.getById(scheduleId) : null;
      expect(schedule?.userId).toEqual(userId);
    }

    it(`/GET: return list of managed users`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/oauth-clients/${oAuthClient.id}/users?limit=10&offset=0`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .set("Origin", `${CLIENT_REDIRECT_URI}`)
        .expect(200);

      const responseBody: ApiSuccessResponse<UserReturned[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toBeGreaterThan(0);
      expect(responseBody.data[0].email).toEqual(postResponseData.user.email);
    });

    it(`/GET/:id`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/oauth-clients/${oAuthClient.id}/users/${postResponseData.user.id}`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .set("Origin", `${CLIENT_REDIRECT_URI}`)
        .expect(200);

      const responseBody: ApiSuccessResponse<UserReturned> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.email).toEqual(getOAuthUserEmail(oAuthClient.id, userEmail));
    });

    it(`/PUT/:id`, async () => {
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
      expect(responseBody.data.email).toEqual(getOAuthUserEmail(oAuthClient.id, userUpdatedEmail));
      expect(responseBody.data.locale).toEqual(Locales.PT_BR);
    });

    it(`/DELETE/:id`, () => {
      return request(app.getHttpServer())
        .delete(`/api/v2/oauth-clients/${oAuthClient.id}/users/${postResponseData.user.id}`)
        .set("x-cal-secret-key", oAuthClient.secret)
        .set("Origin", `${CLIENT_REDIRECT_URI}`)
        .expect(200);
    });

    function getOAuthUserEmail(oAuthClientId: string, userEmail: string) {
      const [username, emailDomain] = userEmail.split("@");
      const email = `${username}+${oAuthClientId}@${emailDomain}`;

      return email;
    }

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      try {
        await userRepositoryFixture.delete(postResponseData.user.id);
      } catch (e) {
        // User might have been deleted by the test
      }
      try {
        await userRepositoryFixture.delete(platformAdmin.id);
      } catch (e) {
        // User might have been deleted by the test
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

    let managedEventType1: EventType;
    let userRepositoryFixture: UserRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;

    let postResponseData: CreateUserResponse;

    const userEmail = "oauth-client-users-user@gmail.com";
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

      organization = await teamRepositoryFixture.create({
        name: "Testy Organization",
        isOrganization: true,
      });

      owner = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        organization: { connect: { id: organization.id } },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${owner.id}`,
        username: userEmail,
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

      managedEventType1 = await eventTypesRepositoryFixture.createTeamEventType({
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

    it(`should create managed user and update team event-types of OAuthClient marked as assignAllTeamMembers: true`, async () => {
      const requestBody: CreateManagedUserInput = {
        email: userEmail,
        timeZone: userTimeZone,
        weekStart: "Monday",
        timeFormat: 24,
        locale: Locales.FR,
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${oAuthClient1.id}/users`)
        .set("x-cal-secret-key", oAuthClient1.secret)
        .send(requestBody)
        .expect(201);

      const responseBody: ApiSuccessResponse<{
        user: Omit<User, "password">;
        accessToken: string;
        refreshToken: string;
      }> = response.body;

      postResponseData = responseBody.data;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();

      await userHasCorrectEventTypes(responseBody.data.user.id);
      await teamHasCorrectEventTypes(team1.id);
    });

    async function userHasCorrectEventTypes(userId: number) {
      const eventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(userId);

      expect(eventTypes?.length).toEqual(5);

      // note(Lauris): managed event-types with assignAllTeamMembers: true
      expect(eventTypes?.find((eventType) => eventType.slug === managedEventType1.slug)).toBeTruthy();

      // note(Lauris): default event types
      expect(
        eventTypes?.find((eventType) => eventType.slug === DEFAULT_EVENT_TYPES.thirtyMinutes.slug)
      ).toBeTruthy();
      expect(
        eventTypes?.find((eventType) => eventType.slug === DEFAULT_EVENT_TYPES.sixtyMinutes.slug)
      ).toBeTruthy();
      expect(
        eventTypes?.find((eventType) => eventType.slug === DEFAULT_EVENT_TYPES.thirtyMinutesVideo.slug)
      ).toBeTruthy();
      expect(
        eventTypes?.find((eventType) => eventType.slug === DEFAULT_EVENT_TYPES.sixtyMinutesVideo.slug)
      ).toBeTruthy();
    }

    async function teamHasCorrectEventTypes(teamId: number) {
      const eventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(teamId);

      expect(eventTypes?.length).toEqual(2);

      // note(Lauris): managed event-types with assignAllTeamMembers: true
      expect(eventTypes?.find((eventType) => eventType.slug === managedEventType1.slug)).toBeTruthy();

      // note(Lauris): check if managed user added to collective event-type hosts given that it has assignAllTeamMembers: true
      const collective = eventTypes?.find((eventType) => eventType.schedulingType === "COLLECTIVE");
      expect(collective).toBeTruthy();
      expect(collective?.hosts).toBeDefined();
      expect(collective?.hosts?.length).toEqual(1);
      expect(collective?.hosts[0].userId).toEqual(postResponseData.user.id);
    }

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient1.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.delete(owner.id);
      try {
        await userRepositoryFixture.delete(postResponseData.user.id);
      } catch (e) {
        // User might have been deleted by the test
      }
      await app.close();
    });
  });
});
