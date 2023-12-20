import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { CreateUserResponse } from "@/modules/oauth/user/oauth-user.controller";
import { CreateUserInput } from "@/modules/user/input/create-user";
import { UpdateUserInput } from "@/modules/user/input/update-user";
import { UserModule } from "@/modules/user/user.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { PlatformOAuthClient, User } from "@prisma/client";
import * as request from "supertest";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiSuccessResponse } from "@calcom/platform-types";

describe("User Endpoints", () => {
  describe("Not authenticated", () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter],
        imports: [AppModule, UserModule],
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
        return request(app.getHttpServer()).put("/api/v2/oauth-clients/100/users/200").expect(401);
      });
    });

    afterAll(async () => {
      await app.close();
    });
  });

  describe("User Authenticated", () => {
    let app: INestApplication;

    let oAuthClient: PlatformOAuthClient;
    let userRepositoryFixture: UserRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;

    let postResponseData: CreateUserResponse;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter],
        imports: [AppModule, UserModule],
      }).compile();

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      oAuthClient = await createOAuthClient();

      await app.init();
    });

    async function createOAuthClient() {
      const organizationId = 1;
      const data = {
        logo: "logo-url",
        name: "name",
        redirect_uris: ["redirect-uri"],
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

    it(`/POST`, async () => {
      const requestBody: CreateUserInput = {
        email: "user-e2e-spec@gmail.com",
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
        .set("x-cal-client-id", oAuthClient.id)
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
      expect(responseBody.data.user.email).toEqual(requestBody.email);
      expect(responseBody.data.accessToken).toBeDefined();
      expect(responseBody.data.refreshToken).toBeDefined();

      await userConnectedToOAuth(responseBody.data.user.email);
    });

    async function userConnectedToOAuth(userEmail: string) {
      const oAuthUsers = await oauthClientRepositoryFixture.getUsers(oAuthClient.id);
      const newOAuthUser = oAuthUsers?.find((user) => user.email === userEmail);

      expect(oAuthUsers?.length).toEqual(1);
      expect(newOAuthUser?.email).toEqual(userEmail);
    }

    it(`/GET/:id`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/oauth-clients/${oAuthClient.id}/users/${postResponseData.user.id}`)
        .set("Authorization", `Bearer ${postResponseData.accessToken}`)
        .expect(200);

      const responseBody: ApiSuccessResponse<Omit<User, "password">> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.email).toEqual(postResponseData.user.email);
    });

    it(`/PUT/:id`, async () => {
      const userUpdatedEmail = "pineapple-pizza@gmail.com";
      const body: UpdateUserInput = { email: userUpdatedEmail };

      const response = await request(app.getHttpServer())
        .put(`/api/v2/oauth-clients/${oAuthClient.id}/users/${postResponseData.user.id}`)
        .set("Authorization", `Bearer ${postResponseData.accessToken}`)
        .send(body)
        .expect(200);

      const responseBody: ApiSuccessResponse<Omit<User, "password">> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.email).toEqual(userUpdatedEmail);
    });

    afterAll(async () => {
      if (postResponseData?.user.id) {
        await userRepositoryFixture.delete(postResponseData.user.id);
      }
      if (oAuthClient) {
        await oauthClientRepositoryFixture.delete(oAuthClient.id);
      }

      await app.close();
    });
  });
});
