import { generateSecret } from "@calcom/platform-libraries";
import type { Membership, Team, User } from "@calcom/prisma/client";
import { AccessScope, OAuthClientType } from "@calcom/prisma/enums";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test, TestingModule } from "@nestjs/testing";
import { getToken } from "next-auth/jwt";
import request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuth2ClientRepositoryFixture } from "test/fixtures/repository/oauth2-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { ZodExceptionFilter } from "@/filters/zod-exception.filter";
import { AuthModule } from "@/modules/auth/auth.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

// Mock next-auth/jwt getToken for ApiAuthStrategy NEXT_AUTH authentication
jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;

describe("OAuth2 Controller Endpoints", () => {
  describe("User Not Authenticated", () => {
    let appWithoutAuth: INestApplication;

    beforeAll(async () => {
      // Mock getToken to return null for unauthenticated tests
      mockGetToken.mockResolvedValue(null);

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
    let oAuthClientFixture: OAuth2ClientRepositoryFixture;

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

      // Mock getToken to return the user email for authenticated tests
      // This is needed because ApiAuthGuard uses ApiAuthStrategy which calls getToken from next-auth/jwt
      mockGetToken.mockResolvedValue({ email: userEmail });

      moduleRef = await Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter, ZodExceptionFilter],
        imports: [AppModule, UsersModule, AuthModule, PrismaModule],
      }).compile();

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      oAuthClientFixture = new OAuth2ClientRepositoryFixture(moduleRef);

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

    describe("GET /api/v2/auth/oauth2/clients/:clientId", () => {
      it("should return OAuth client info for valid client ID", async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v2/auth/oauth2/clients/${testClientId}`)
          .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.data.id).toBe(testClientId);
        expect(response.body.data.name).toBe("Test OAuth Client");
        expect(response.body.data.redirectUri).toBe(testRedirectUri);
        expect(response.body.data.type).toBe(OAuthClientType.CONFIDENTIAL);
        expect(response.body.data.clientSecret).toBeUndefined();
      });

      it("should return 404 for non-existent client ID", async () => {
        await request(app.getHttpServer())
          .get("/api/v2/auth/oauth2/clients/non-existent-client-id")
          .expect(404);
      });
    });

    describe("POST /api/v2/auth/oauth2/clients/:clientId/authorize", () => {
      it("should redirect with authorization code for valid request", async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/authorize`)
          .send({
            redirectUri: testRedirectUri,
            scopes: [AccessScope.READ_BOOKING, AccessScope.READ_PROFILE],
            teamSlug: team.slug,
            state: "test-state-123",
          })
          .expect(303);

        expect(response.headers.location).toBeDefined();
        const redirectUrl = new URL(response.headers.location);
        expect(redirectUrl.origin + redirectUrl.pathname).toBe(testRedirectUri);
        expect(redirectUrl.searchParams.get("code")).toBeDefined();
        expect(redirectUrl.searchParams.get("state")).toBe("test-state-123");

        authorizationCode = redirectUrl.searchParams.get("code") as string;
      });

      it("should redirect with error for invalid client ID", async () => {
        await request(app.getHttpServer())
          .post("/api/v2/auth/oauth2/clients/invalid-client-id/authorize")
          .send({
            redirectUri: testRedirectUri,
            scopes: [AccessScope.READ_BOOKING],
          })
          .expect(404);
      });

      it("should redirect with error for invalid team slug", async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/authorize`)
          .send({
            redirectUri: testRedirectUri,
            scopes: [AccessScope.READ_BOOKING],
            teamSlug: "non-existent-team-slug",
            state: "test-state-456",
          })
          .expect(303);

        expect(response.headers.location).toBeDefined();
        const redirectUrl = new URL(response.headers.location);
        expect(redirectUrl.searchParams.get("error")).toBe("access_denied");
        expect(redirectUrl.searchParams.get("state")).toBe("test-state-456");
      });

      it("should throw error 400 for mismatched redirect URI", async () => {
        await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/authorize`)
          .send({
            redirectUri: "https://wrong-domain.com/callback",
            scopes: [AccessScope.READ_BOOKING],
            state: "test-state-789",
          })
          .expect(400);
      });
    });

    describe("POST /api/v2/auth/oauth2/clients/:clientId/exchange", () => {
      it("should exchange authorization code for tokens", async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/exchange`)
          .send({
            code: authorizationCode,
            clientSecret: testClientSecret,
            redirectUri: testRedirectUri,
          })
          .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.data.access_token).toBeDefined();
        expect(response.body.data.refresh_token).toBeDefined();
        expect(response.body.data.token_type).toBe("bearer");
        expect(response.body.data.expires_in).toBe(1800);

        refreshToken = response.body.data.refresh_token;
      });

      it("should return 400 for invalid/used authorization code", async () => {
        await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/exchange`)
          .send({
            code: authorizationCode,
            clientSecret: testClientSecret,
            redirectUri: testRedirectUri,
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
          .expect(303);

        const newRedirectUrl = new URL(newAuthResponse.headers.location);
        const newAuthCode = newRedirectUrl.searchParams.get("code") as string;

        await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/exchange`)
          .send({
            code: newAuthCode,
            clientSecret: "wrong-secret",
            redirectUri: testRedirectUri,
          })
          .expect(401);
      });
    });

    describe("POST /api/v2/auth/oauth2/clients/:clientId/refresh", () => {
      it("should refresh access token with valid refresh token", async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/refresh`)
          .send({
            refreshToken: refreshToken,
            clientSecret: testClientSecret,
          })
          .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.data.access_token).toBeDefined();
        expect(response.body.data.refresh_token).toBeDefined();
        expect(response.body.data.token_type).toBe("bearer");
        expect(response.body.data.expires_in).toBe(1800);
      });

      it("should return 400 for invalid refresh token", async () => {
        await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/refresh`)
          .send({
            refreshToken: "invalid-refresh-token",
            clientSecret: testClientSecret,
          })
          .expect(400);
      });

      it("should return 401 for wrong client ID with valid refresh token", async () => {
        await request(app.getHttpServer())
          .post("/api/v2/auth/oauth2/clients/wrong-client-id/refresh")
          .send({
            refreshToken: refreshToken,
            clientSecret: testClientSecret,
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
