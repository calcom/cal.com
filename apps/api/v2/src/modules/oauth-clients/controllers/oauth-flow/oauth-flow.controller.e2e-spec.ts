import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { ZodExceptionFilter } from "@/filters/zod-exception.filter";
import { AuthModule } from "@/modules/auth/auth.module";
import { JwtService } from "@/modules/jwt/jwt.service";
import { OAuthAuthorizeInput } from "@/modules/oauth-clients/inputs/authorize.input";
import { ExchangeAuthorizationCodeInput } from "@/modules/oauth-clients/inputs/exchange-code.input";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withNextAuth } from "test/utils/withNextAuth";

import { X_CAL_SECRET_KEY } from "@calcom/platform-constants";
import type { PlatformOAuthClient, Team, User } from "@calcom/prisma/client";

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
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let oAuthClientsRepositoryFixture: OAuthClientRepositoryFixture;
    let profilesRepositoryFixture: ProfileRepositoryFixture;
    let membershipRepositoryFixture: MembershipRepositoryFixture;

    let user: User;
    let organization: Team;
    let oAuthClient: PlatformOAuthClient;

    let authorizationCode: string | null;
    let responseRefreshToken: string;

    beforeAll(async () => {
      const userEmail = `oauth-flow-user-${randomString()}@api.com`;

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
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      usersRepositoryFixtures = new UserRepositoryFixture(moduleRef);
      profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
      membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await usersRepositoryFixtures.create({
        email: userEmail,
      });

      organization = await organizationsRepositoryFixture.create({
        name: `oauth-flow-organization-${randomString()}`,
      });
      await profilesRepositoryFixture.create({
        uid: "asd-asd",
        username: userEmail,
        user: { connect: { id: user.id } },
        movedFromUser: { connect: { id: user.id } },
        organization: { connect: { id: organization.id } },
      });

      await membershipRepositoryFixture.create({
        user: { connect: { id: user.id } },
        team: { connect: { id: organization.id } },
        role: "OWNER",
        accepted: true,
      });
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
          .post(`/v2/oauth/${oAuthClient.id}/authorize`)
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
          .post(`/v2/oauth/${oAuthClient.id}/exchange`)
          .set("Authorization", authorizationToken)
          .send(body)
          .expect(200);

        const { accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } = response.body.data;
        expect(accessToken).toBeDefined();
        expect(refreshToken).toBeDefined();
        expect(accessTokenExpiresAt).toBeDefined();
        expect(refreshTokenExpiresAt).toBeDefined();

        const jwtService = app.get(JwtService);
        const decodedAccessToken = jwtService.decode(accessToken);
        const decodedRefreshToken = jwtService.decode(refreshToken);

        expect(decodedAccessToken.clientId).toBe(oAuthClient.id);
        expect(decodedAccessToken.ownerId).toBe(user.id);
        expect(decodedAccessToken.type).toBe("access_token");
        expect(decodedAccessToken.expiresAt).toBe(new Date(accessTokenExpiresAt).valueOf());
        expect(decodedAccessToken.iat).toBeGreaterThan(0);

        expect(decodedRefreshToken.clientId).toBe(oAuthClient.id);
        expect(decodedRefreshToken.ownerId).toBe(user.id);
        expect(decodedRefreshToken.type).toBe("refresh_token");
        expect(decodedRefreshToken.expiresAt).toBe(new Date(refreshTokenExpiresAt).valueOf());
        expect(decodedRefreshToken.iat).toBeGreaterThan(0);

        responseRefreshToken = refreshToken;
      });
    });

    describe("Refresh Token Endpoint", () => {
      it("POST /oauth/:clientId/refresh", async () => {
        const secretKey = oAuthClient.secret;
        const body = {
          refreshToken: responseRefreshToken,
        };

        const response = await request(app.getHttpServer())
          .post(`/v2/oauth/${oAuthClient.id}/refresh`)
          .set("x-cal-secret-key", secretKey)
          .send(body)
          .expect(200);

        const { accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } = response.body.data;
        expect(accessToken).toBeDefined();
        expect(refreshToken).toBeDefined();
        expect(accessTokenExpiresAt).toBeDefined();
        expect(refreshTokenExpiresAt).toBeDefined();

        const jwtService = app.get(JwtService);
        const decodedAccessToken = jwtService.decode(accessToken);
        const decodedRefreshToken = jwtService.decode(refreshToken);

        expect(decodedAccessToken.clientId).toBe(oAuthClient.id);
        expect(decodedAccessToken.ownerId).toBe(user.id);
        expect(decodedAccessToken.userId).toBe(user.id);
        expect(decodedAccessToken.type).toBe("access_token");
        expect(decodedAccessToken.expiresAt).toBe(new Date(accessTokenExpiresAt).valueOf());
        expect(decodedAccessToken.iat).toBeGreaterThan(0);

        expect(decodedRefreshToken.clientId).toBe(oAuthClient.id);
        expect(decodedRefreshToken.ownerId).toBe(user.id);
        expect(decodedRefreshToken.userId).toBe(user.id);
        expect(decodedRefreshToken.type).toBe("refresh_token");
        expect(decodedRefreshToken.expiresAt).toBe(new Date(refreshTokenExpiresAt).valueOf());
        expect(decodedRefreshToken.iat).toBeGreaterThan(0);

        responseRefreshToken = refreshToken;
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
