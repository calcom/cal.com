import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { DEFAULT_EVENT_TYPES } from "@/ee/event-types/constants/constants";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
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
import { PlatformOAuthClient, Team, User } from "@prisma/client";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
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

    let postResponseData: CreateUserResponse;

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
      organization = await teamRepositoryFixture.create({ name: "organization" });
      oAuthClient = await createOAuthClient(organization.id);

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
        defaultEventTypes?.find((eventType) => eventType.length === DEFAULT_EVENT_TYPES.thirtyMinutes.length)
      ).toBeTruthy();
      expect(
        defaultEventTypes?.find((eventType) => eventType.length === DEFAULT_EVENT_TYPES.sixtyMinutes.length)
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
      const body: UpdateManagedUserInput = { email: userUpdatedEmail };

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
      await app.close();
    });
  });
});
