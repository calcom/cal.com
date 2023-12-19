import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
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

  describe("User Not Authenticated", () => {
    it(`/POST`, () => {
      return request(app.getHttpServer()).post("/api/v2/users").expect(401);
    });
    it(`/GET/:id`, () => {
      return request(app.getHttpServer()).get("/api/v2/users/1234").expect(401);
    });
    it(`/PUT/:id`, () => {
      return request(app.getHttpServer()).put("/api/v2/users/1234").expect(401);
    });
    it(`/DELETE/:id`, () => {
      return request(app.getHttpServer()).delete("/api/v2/users/1234").expect(401);
    });
  });

  describe("User Authenticated", () => {
    let createdUser: { id: number; email: string };
    let accessToken: string;
    let oAuthClient: PlatformOAuthClient;
    const requestBody: CreateUserInput = {
      email: "user-e2e-spec@gmail.com",
    };

    let userRepositoryFixture: UserRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter],
        imports: [AppModule, UserModule],
      }).compile();

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      const organizationId = 1;
      const data = {
        logo: "logo-url",
        name: "name",
        redirect_uris: ["redirect-uri"],
        permissions: 32,
      };
      const secret = "secret";

      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      oAuthClient = await oauthClientRepositoryFixture.create(organizationId, data, secret);
      await app.init();
    });

    it("should be defined", () => {
      expect(oauthClientRepositoryFixture).toBeDefined();
      expect(userRepositoryFixture).toBeDefined();
      expect(oAuthClient).toBeDefined();
    });

    it(`/POST`, () => {
      return request(app.getHttpServer()).post("/api/v2/users").send(requestBody).expect(401);
    });

    it(`/POST`, async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v2/users")
        .set("x-cal-client-id", oAuthClient.id)
        .set("x-cal-secret-key", oAuthClient.secret)
        .send(requestBody)
        .expect(201);

      const responseBody: ApiSuccessResponse<{
        user: Omit<User, "password">;
        accessToken: string;
        refreshToken: string;
      }> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.user.email).toEqual(requestBody.email);
      expect(responseBody.data.accessToken).toBeDefined();
      expect(responseBody.data.refreshToken).toBeDefined();

      createdUser = {
        id: responseBody.data.user.id,
        email: responseBody.data.user.email,
      };

      accessToken = responseBody.data.accessToken;
    });

    it(`/GET/:id`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/users/${createdUser.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const responseBody: ApiSuccessResponse<Omit<User, "password">> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.email).toEqual(requestBody.email);
    });

    it(`/PUT/:id`, async () => {
      const userUpdatedEmail = "pineapple-pizza@gmail.com";
      const body: UpdateUserInput = { email: userUpdatedEmail };

      const response = await request(app.getHttpServer())
        .put(`/api/v2/users/${createdUser.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(body)
        .expect(200);

      const responseBody: ApiSuccessResponse<Omit<User, "password">> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.email).toEqual(userUpdatedEmail);
    });

    it(`/DELETE/:id`, () => {
      return request(app.getHttpServer())
        .delete(`/api/v2/users/${createdUser.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(204);
    });

    afterAll(async () => {
      const failedToDelete = createdUser.id ? await userRepositoryFixture.get(createdUser.id) : false;

      if (failedToDelete) {
        await userRepositoryFixture.deleteByEmail(createdUser.email);
      }
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
