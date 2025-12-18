import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { ZodExceptionFilter } from "@/filters/zod-exception.filter";
import { AuthModule } from "@/modules/auth/auth.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withNextAuth } from "test/utils/withNextAuth";

import { generateSecret } from "@calcom/platform-libraries";
import { AccessScope, OAuthClientType } from "@calcom/prisma/enums";
import type { Membership, Team, User } from "@calcom/prisma/client";

class OAuthClientFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async create(data: {
    clientId: string;
    name: string;
    redirectUri: string;
    clientSecret?: string;
    clientType?: OAuthClientType;
    logo?: string;
    isTrusted?: boolean;
  }) {
    return this.prismaWriteClient.oAuthClient.create({
      data: {
        clientId: data.clientId,
        name: data.name,
        redirectUri: data.redirectUri,
        clientSecret: data.clientSecret,
        clientType: data.clientType || OAuthClientType.CONFIDENTIAL,
        logo: data.logo,
        isTrusted: data.isTrusted || false,
      },
    });
  }

  async delete(clientId: string) {
    return this.prismaWriteClient.oAuthClient.delete({
      where: { clientId },
    });
  }
}

describe("OAuth2 Controller Endpoints", () => {
  describe("User Not Authenticated", () => {
    let appWithoutAuth: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter, ZodExceptionFilter],
        imports: [AppModule, UsersModule, AuthModule, PrismaModule],
      }).compile();
      appWithoutAuth = moduleRef.createNestApplication();
      bootstrap(appWithoutAuth as NestExpressApplication);
      await appWithoutAuth.init();
    });

    it("GET /v2/auth/oauth2/clients/:clientId should return 401 without auth", () => {
      return request(appWithoutAuth.getHttpServer())
        .get("/api/v2/auth/oauth2/clients/test-client-id")
        .expect(401);
    });

    it("POST /v2/auth/oauth2/clients/:clientId/authorize should return 401 without auth", () => {
      return request(appWithoutAuth.getHttpServer())
        .post("/api/v2/auth/oauth2/clients/test-client-id/authorize")
        .send({
          redirectUri: "https://example.com/callback",
          scopes: ["READ_BOOKING"],
        })
        .expect(401);
    });

    afterAll(async () => {
      await appWithoutAuth.close();
    });
  });

  describe("User Authenticated", () => {
    let app: INestApplication;
    let moduleRef: TestingModule;

    let userRepositoryFixture: UserRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let membershipRepositoryFixture: MembershipRepositoryFixture;
    let oAuthClientFixture: OAuthClientFixture;

    let user: User;
    let team: Team;
    let membership: Membership;
    let oAuthClient: { clientId: string };
    let authorizationCode: string;
    let refreshToken: string;

    const testClientId = `test-oauth-client-${randomString()}`;
    const testClientSecret = "test-secret-123";
    const testRedirectUri = "https://example.com/callback";

    beforeAll(async () => {
      const userEmail = `oauth2-e2e-user-${randomString()}@api.com`;

      moduleRef = await withNextAuth(
        userEmail,
        Test.createTestingModule({
          providers: [PrismaExceptionFilter, HttpExceptionFilter, ZodExceptionFilter],
          imports: [AppModule, UsersModule, AuthModule, PrismaModule],
        })
      ).compile();

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      oAuthClientFixture = new OAuthClientFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
      });

      team = await teamRepositoryFixture.create({
        name: `oauth2-e2e-team-${randomString()}`,
        slug: `oauth2-e2e-team-${randomString()}`,
      });

      membership = await membershipRepositoryFixture.create({
        user: { connect: { id: user.id } },
        team: { connect: { id: team.id } },
        role: "OWNER",
        accepted: true,
      });

      const [hashedSecret] = generateSecret(testClientSecret);
      oAuthClient = await oAuthClientFixture.create({
        clientId: testClientId,
        name: "Test OAuth Client",
        redirectUri: testRedirectUri,
        clientSecret: hashedSecret,
        clientType: OAuthClientType.CONFIDENTIAL,
      });
    });

    describe("GET /v2/auth/oauth2/clients/:clientId", () => {
      it("should return OAuth client info for valid client ID", async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v2/auth/oauth2/clients/${testClientId}`)
          .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.data.clientId).toBe(testClientId);
        expect(response.body.data.name).toBe("Test OAuth Client");
        expect(response.body.data.redirectUri).toBe(testRedirectUri);
      });

      it("should return 404 for non-existent client ID", async () => {
        const response = await request(app.getHttpServer())
          .get("/api/v2/auth/oauth2/clients/non-existent-client-id")
          .expect(404);

        expect(response.body.message).toContain("not found");
      });
    });

    describe("POST /v2/auth/oauth2/clients/:clientId/authorize", () => {
      it("should generate authorization code for valid request", async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/authorize`)
          .send({
            redirectUri: testRedirectUri,
            scopes: [AccessScope.READ_BOOKING, AccessScope.READ_PROFILE],
            teamSlug: team.slug,
          })
          .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.data.authorizationCode).toBeDefined();
        expect(typeof response.body.data.authorizationCode).toBe("string");

        authorizationCode = response.body.data.authorizationCode;
      });

      it("should return 401 for invalid client ID", async () => {
        await request(app.getHttpServer())
          .post("/api/v2/auth/oauth2/clients/invalid-client-id/authorize")
          .send({
            redirectUri: testRedirectUri,
            scopes: [AccessScope.READ_BOOKING],
          })
          .expect(401);
      });

      it("should return 401 for invalid team slug", async () => {
        await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/authorize`)
          .send({
            redirectUri: testRedirectUri,
            scopes: [AccessScope.READ_BOOKING],
            teamSlug: "non-existent-team-slug",
          })
          .expect(401);
      });
    });

    describe("POST /v2/auth/oauth2/clients/:clientId/exchange", () => {
      it("should exchange authorization code for tokens", async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/exchange`)
          .send({
            code: authorizationCode,
            clientSecret: testClientSecret,
            redirectUri: testRedirectUri,
            grantType: "authorization_code",
          })
          .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
        expect(response.body.data.tokenType).toBe("bearer");
        expect(response.body.data.expiresIn).toBe(1800);

        refreshToken = response.body.data.refreshToken;
      });

      it("should return 400 for invalid/used authorization code", async () => {
        await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/exchange`)
          .send({
            code: authorizationCode,
            clientSecret: testClientSecret,
            redirectUri: testRedirectUri,
            grantType: "authorization_code",
          })
          .expect(400);
      });

      it("should return 401 for invalid client secret", async () => {
        const newAuthResponse = await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/authorize`)
          .send({
            redirectUri: testRedirectUri,
            scopes: [AccessScope.READ_BOOKING],
            teamSlug: team.slug,
          })
          .expect(200);

        await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/exchange`)
          .send({
            code: newAuthResponse.body.data.authorizationCode,
            clientSecret: "wrong-secret",
            redirectUri: testRedirectUri,
            grantType: "authorization_code",
          })
          .expect(401);
      });
    });

    describe("POST /v2/auth/oauth2/clients/:clientId/refresh", () => {
      it("should refresh access token with valid refresh token", async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/refresh`)
          .send({
            refreshToken: refreshToken,
            clientSecret: testClientSecret,
            grantType: "refresh_token",
          })
          .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
        expect(response.body.data.tokenType).toBe("bearer");
        expect(response.body.data.expiresIn).toBe(1800);
      });

      it("should return 400 for invalid refresh token", async () => {
        await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/refresh`)
          .send({
            refreshToken: "invalid-refresh-token",
            clientSecret: testClientSecret,
            grantType: "refresh_token",
          })
          .expect(400);
      });

      it("should return 401 for wrong client ID with valid refresh token", async () => {
        await request(app.getHttpServer())
          .post("/api/v2/auth/oauth2/clients/wrong-client-id/refresh")
          .send({
            refreshToken: refreshToken,
            clientSecret: testClientSecret,
            grantType: "refresh_token",
          })
          .expect(401);
      });
    });

    afterAll(async () => {
      await oAuthClientFixture.delete(oAuthClient.clientId);
      await membershipRepositoryFixture.delete(membership.id);
      await teamRepositoryFixture.delete(team.id);
      await userRepositoryFixture.delete(user.id);
      await app.close();
    });
  });
});
