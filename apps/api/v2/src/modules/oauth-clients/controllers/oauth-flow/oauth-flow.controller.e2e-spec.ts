import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { ZodExceptionFilter } from "@/filters/zod-exception.filter";
import { AuthModule } from "@/modules/auth/auth.module";
import { OAuthAuthorizeInput } from "@/modules/oauth-clients/inputs/authorize.input";
import { ExchangeAuthorizationCodeInput } from "@/modules/oauth-clients/inputs/exchange-code.input";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test, TestingModule } from "@nestjs/testing";
import { PlatformOAuthClient, Team, User } from "@prisma/client";
import * as request from "supertest";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withNextAuth } from "test/utils/withNextAuth";

import { X_CAL_SECRET_KEY } from "@calcom/platform-constants";

describe("OAuthFlow Endpoints", () => {
  describe("User Not Authenticated", () => {
    let appWithoutAuth: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter, ZodExceptionFilter],
        imports: [AppModule, OAuthClientModule, UsersModule, AuthModule, PrismaModule],
      }).compile();
      appWithoutAuth = moduleRef.createNestApplication();
      bootstrap(appWithoutAuth as NestExpressApplication);
      await appWithoutAuth.init();
    });

    it(`POST /oauth/:clientId/authorize missing Cookie with user`, () => {
      return request(appWithoutAuth.getHttpServer()).post("/api/v2/oauth/100/authorize").expect(401);
    });

    it(`POST /oauth/:clientId/exchange missing Authorization Bearer token`, () => {
      return request(appWithoutAuth.getHttpServer()).post("/api/v2/oauth/100/exchange").expect(400);
    });

    it(`POST /oauth/:clientId/refresh missing ${X_CAL_SECRET_KEY} header with secret`, () => {
      return request(appWithoutAuth.getHttpServer()).post("/api/v2/oauth/100/refresh").expect(401);
    });

    afterAll(async () => {
      await appWithoutAuth.close();
    });
  });

  describe("User Authenticated", () => {
    let app: INestApplication;

    let usersRepositoryFixtures: UserRepositoryFixture;
    let organizationsRepositoryFixture: TeamRepositoryFixture;
    let oAuthClientsRepositoryFixture: OAuthClientRepositoryFixture;

    let user: User;
    let organization: Team;
    let oAuthClient: PlatformOAuthClient;

    let authorizationCode: string | null;
    let refreshToken: string;

    beforeAll(async () => {
      const userEmail = "developer@platform.com";

      const moduleRef: TestingModule = await withNextAuth(
        userEmail,
        Test.createTestingModule({
          providers: [PrismaExceptionFilter, HttpExceptionFilter, ZodExceptionFilter],
          imports: [AppModule, OAuthClientModule, UsersModule, AuthModule, PrismaModule],
        })
      ).compile();

      app = moduleRef.createNestApplication();
      await app.init();

      oAuthClientsRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      usersRepositoryFixtures = new UserRepositoryFixture(moduleRef);

      user = await usersRepositoryFixtures.create({
        email: userEmail,
      });
      organization = await organizationsRepositoryFixture.create({ name: "organization" });
      oAuthClient = await createOAuthClient(organization.id);
    });

    async function createOAuthClient(organizationId: number) {
      const data = {
        logo: "logo-url",
        name: "name",
        redirectUris: ["redirect-uri.com"],
        permissions: 32,
      };
      const secret = "secret";

      const client = await oAuthClientsRepositoryFixture.create(organizationId, data, secret);
      return client;
    }

    describe("Authorize Endpoint", () => {
      it("POST /oauth/:clientId/authorize", async () => {
        const body: OAuthAuthorizeInput = {
          redirectUri: oAuthClient.redirectUris[0],
        };

        const REDIRECT_STATUS = 302;

        const response = await request(app.getHttpServer())
          .post(`/oauth/${oAuthClient.id}/authorize`)
          .send(body)
          .expect(REDIRECT_STATUS);

        const baseUrl = "http://www.localhost/";
        const redirectUri = new URL(response.header.location, baseUrl);
        authorizationCode = redirectUri.searchParams.get("code");

        expect(authorizationCode).toBeDefined();
      });
    });

    describe("Exchange Endpoint", () => {
      it("POST /oauth/:clientId/exchange", async () => {
        const authorizationToken = `Bearer ${authorizationCode}`;
        const body: ExchangeAuthorizationCodeInput = {
          clientSecret: oAuthClient.secret,
        };

        const response = await request(app.getHttpServer())
          .post(`/oauth/${oAuthClient.id}/exchange`)
          .set("Authorization", authorizationToken)
          .send(body)
          .expect(200);

        expect(response.body?.data?.accessToken).toBeDefined();
        expect(response.body?.data?.refreshToken).toBeDefined();

        refreshToken = response.body.data.refreshToken;
      });
    });

    describe("Refresh Token Endpoint", () => {
      it("POST /oauth/:clientId/refresh", () => {
        const secretKey = oAuthClient.secret;
        const body = {
          refreshToken,
        };

        return request(app.getHttpServer())
          .post(`/oauth/${oAuthClient.id}/refresh`)
          .set("x-cal-secret-key", secretKey)
          .send(body)
          .expect(200)
          .then((response) => {
            expect(response.body?.data?.accessToken).toBeDefined();
            expect(response.body?.data?.refreshToken).toBeDefined();
          });
      });
    });

    afterAll(async () => {
      await oAuthClientsRepositoryFixture.delete(oAuthClient.id);
      await organizationsRepositoryFixture.delete(organization.id);
      await usersRepositoryFixtures.delete(user.id);

      await app.close();
    });
  });
});
