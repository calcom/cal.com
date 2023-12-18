import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { AuthModule } from "@/modules/auth/auth.module";
import { NextAuthStrategy } from "@/modules/auth/strategy";
import { CreateOAuthClientInput } from "@/modules/oauth/input/create-oauth-client";
import { UpdateOAuthClientInput } from "@/modules/oauth/input/update-oauth-client";
import { OAuthClientModule } from "@/modules/oauth/oauth-client.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { CreateUserInput } from "@/modules/user/input/create-user";
import { UserModule } from "@/modules/user/user.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { Membership, PlatformOAuthClient, Team, User } from "@prisma/client";
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
    // it(`/GET/:id`, () => {
    //     return request(app.getHttpServer()).get("/api/v2/users/1234").expect(401);
    // });
    // it(`/PUT/:id`, () => {
    //     return request(app.getHttpServer()).put("/api/v2/users/1234").expect(401);
    // });
    // it(`/DELETE/:id`, () => {
    //     return request(app.getHttpServer()).delete("/api/v2/users/1234").expect(401);
    // });
  });

  describe("User Authenticated", () => {
    let user: { id: number; email: string };
    let oAuthClient: PlatformOAuthClient;

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
      return request(app.getHttpServer()).post("/api/v2/users").expect(401);
    });

    it(`/POST`, () => {
      const email = "user@gmail.com";
      const body: CreateUserInput = {
        email,
      };

      return request(app.getHttpServer())
        .post("/api/v2/users")
        .set("x-cal-client-id", oAuthClient.id)
        .set("x-cal-secret-key", oAuthClient.secret)
        .send(body)
        .expect(201)
        .then((response) => {
          const responseBody: ApiSuccessResponse<{
            user: Omit<User, "password">;
            accessToken: string;
            refreshToken: string;
          }> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.user.email).toEqual(email);
          expect(responseBody.data.accessToken).toBeDefined();
          expect(responseBody.data.refreshToken).toBeDefined();

          user = {
            id: responseBody.data.user.id,
            email: responseBody.data.user.email,
          };
        });
    });

    afterAll(async () => {
      console.log("asap userRepositoryFixture", userRepositoryFixture);
      await userRepositoryFixture.deleteByEmail(user.email);
    });

    // it(`/GET/:id`, () => {
    //     return request(app.getHttpServer()).get(`/api/v2/users/${user.id}`).expect(401);
    // });
    // it(`/PUT/:id`, () => {
    //     return request(app.getHttpServer()).put(`/api/v2/users/${user.id}`).expect(401);
    // });
    // it(`/DELETE/:id`, () => {
    //     return request(app.getHttpServer()).delete(`/api/v2/users/${user.id}`).expect(401);
    // });
  });

  afterAll(async () => {
    await app.close();
  });
});
