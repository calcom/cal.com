import { generateSecret } from "@calcom/platform-libraries";
import type { Membership, Team, User } from "@calcom/prisma/client";
import { AccessScope, OAuthClientStatus, OAuthClientType } from "@calcom/prisma/enums";
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
          redirect_uri: "https://example.com/callback",
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
        expect(response.body.data.client_id).toBe(testClientId);
        expect(response.body.data.name).toBe("Test OAuth Client");
        expect(response.body.data.redirect_uri).toBe(testRedirectUri);
        expect(response.body.data.client_type).toBe(OAuthClientType.CONFIDENTIAL);
        expect(response.body.data.client_secret).toBeUndefined();
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
            redirect_uri: testRedirectUri,
            scopes: [AccessScope.READ_BOOKING, AccessScope.READ_PROFILE],
            team_slug: team.slug,
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

      it("should return 404 for invalid client ID (not redirect)", async () => {
        await request(app.getHttpServer())
          .post("/api/v2/auth/oauth2/clients/invalid-client-id/authorize")
          .send({
            redirect_uri: testRedirectUri,
            scopes: [AccessScope.READ_BOOKING],
          })
          .expect(404);
      });

      it("should redirect with error for invalid team slug", async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/authorize`)
          .send({
            redirect_uri: testRedirectUri,
            scopes: [AccessScope.READ_BOOKING],
            team_slug: "non-existent-team-slug",
            state: "test-state-456",
          })
          .expect(303);

        expect(response.headers.location).toBeDefined();
        const redirectUrl = new URL(response.headers.location);
        expect(redirectUrl.searchParams.get("error")).toBe("access_denied");
        expect(redirectUrl.searchParams.get("state")).toBe("test-state-456");
      });

      it("should return 400 for mismatched redirect URI (not redirect)", async () => {
        await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/authorize`)
          .send({
            redirect_uri: "https://wrong-domain.com/callback",
            scopes: [AccessScope.READ_BOOKING],
            state: "test-state-789",
          })
          .expect(400);
      });

      it("should return 401 for unapproved client (not redirect)", async () => {
        const pendingClientId = `test-pending-client-${randomString()}`;
        const [hashedSecret] = generateSecret("pending-secret");
        await oAuthClientFixture.create({
          clientId: pendingClientId,
          name: "Pending OAuth Client",
          redirectUri: testRedirectUri,
          clientSecret: hashedSecret,
          clientType: OAuthClientType.CONFIDENTIAL,
          status: OAuthClientStatus.PENDING,
        });

        try {
          await request(app.getHttpServer())
            .post(`/api/v2/auth/oauth2/clients/${pendingClientId}/authorize`)
            .send({
              redirect_uri: testRedirectUri,
              scopes: [AccessScope.READ_BOOKING],
              state: "test-state-pending",
            })
            .expect(401);
        } finally {
          await oAuthClientFixture.delete(pendingClientId);
        }
      });
    });

    describe("POST /api/v2/auth/oauth2/token (authorization_code grant)", () => {
      it("should exchange authorization code for tokens", async () => {
        const response = await request(app.getHttpServer())
          .post("/api/v2/auth/oauth2/token")
          .type("form")
          .send({
            client_id: testClientId,
            grant_type: "authorization_code",
            code: authorizationCode,
            client_secret: testClientSecret,
            redirect_uri: testRedirectUri,
          })
          .expect(200);

        expect(response.body.access_token).toBeDefined();
        expect(response.body.refresh_token).toBeDefined();
        expect(response.body.token_type).toBe("bearer");
        expect(response.body.expires_in).toBe(1800);
        expect(response.headers["cache-control"]).toBe("no-store");
        expect(response.headers["pragma"]).toBe("no-cache");

        refreshToken = response.body.refresh_token;
      });

      it("should exchange authorization code for tokens with JSON body", async () => {
        const authResponse = await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/authorize`)
          .send({
            redirect_uri: testRedirectUri,
            scopes: [AccessScope.READ_BOOKING],
            team_slug: team.slug,
          })
          .expect(303);

        const redirectUrl = new URL(authResponse.headers.location);
        const code = redirectUrl.searchParams.get("code") as string;

        const response = await request(app.getHttpServer())
          .post("/api/v2/auth/oauth2/token")
          .send({
            client_id: testClientId,
            grant_type: "authorization_code",
            code,
            client_secret: testClientSecret,
            redirect_uri: testRedirectUri,
          })
          .expect(200);

        expect(response.body.access_token).toBeDefined();
        expect(response.body.refresh_token).toBeDefined();
        expect(response.body.token_type).toBe("bearer");
      });

      it("should return 400 with RFC 6749 error for invalid/used authorization code", async () => {
        const response = await request(app.getHttpServer())
          .post("/api/v2/auth/oauth2/token")
          .type("form")
          .send({
            client_id: testClientId,
            grant_type: "authorization_code",
            code: authorizationCode,
            client_secret: testClientSecret,
            redirect_uri: testRedirectUri,
          })
          .expect(400);

        expect(response.body.error).toBe("invalid_grant");
        expect(response.body.error_description).toBe("code_invalid_or_expired");
      });

      it("should return 401 for invalid client secret", async () => {
        const newAuthResponse = await request(app.getHttpServer())
          .post(`/api/v2/auth/oauth2/clients/${testClientId}/authorize`)
          .send({
            redirect_uri: testRedirectUri,
            scopes: [AccessScope.READ_BOOKING],
            team_slug: team.slug,
          })
          .expect(303);

        const newRedirectUrl = new URL(newAuthResponse.headers.location);
        const newAuthCode = newRedirectUrl.searchParams.get("code") as string;

        const response = await request(app.getHttpServer())
          .post("/api/v2/auth/oauth2/token")
          .type("form")
          .send({
            client_id: testClientId,
            grant_type: "authorization_code",
            code: newAuthCode,
            client_secret: "wrong-secret",
            redirect_uri: testRedirectUri,
          })
          .expect(401);

        expect(response.body.error).toBe("invalid_client");
        expect(response.body.error_description).toBe("invalid_client_credentials");
      });

      it("should return 400 for invalid grant type", async () => {
        await request(app.getHttpServer())
          .post("/api/v2/auth/oauth2/token")
          .type("form")
          .send({
            client_id: testClientId,
            grant_type: "invalid_grant",
            code: "some-code",
            redirect_uri: testRedirectUri,
          })
          .expect(400);
      });

      it("should return 400 with RFC 6749 error when client_id is missing", async () => {
        const response = await request(app.getHttpServer())
          .post("/api/v2/auth/oauth2/token")
          .type("form")
          .send({
            grant_type: "authorization_code",
            code: "some-code",
            client_secret: testClientSecret,
            redirect_uri: testRedirectUri,
          })
          .expect(400);

        expect(response.body.error).toBe("invalid_request");
        expect(response.body.error_description).toBe("client_id is required");
      });
    });

    describe("POST /api/v2/auth/oauth2/token (refresh_token grant)", () => {
      it("should refresh access token with valid refresh token", async () => {
        const response = await request(app.getHttpServer())
          .post("/api/v2/auth/oauth2/token")
          .type("form")
          .send({
            client_id: testClientId,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_secret: testClientSecret,
          })
          .expect(200);

        expect(response.body.access_token).toBeDefined();
        expect(response.body.refresh_token).toBeDefined();
        expect(response.body.token_type).toBe("bearer");
        expect(response.body.expires_in).toBe(1800);
      });

      it("should return 400 with RFC 6749 error for invalid refresh token", async () => {
        const response = await request(app.getHttpServer())
          .post("/api/v2/auth/oauth2/token")
          .type("form")
          .send({
            client_id: testClientId,
            grant_type: "refresh_token",
            refresh_token: "invalid-refresh-token",
            client_secret: testClientSecret,
          })
          .expect(400);

        expect(response.body.error).toBe("invalid_grant");
        expect(response.body.error_description).toBe("invalid_refresh_token");
      });

      it("should return 401 with RFC 6749 error for non-existent client_id", async () => {
        const response = await request(app.getHttpServer())
          .post("/api/v2/auth/oauth2/token")
          .type("form")
          .send({
            client_id: "wrong-client-id",
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_secret: testClientSecret,
          })
          .expect(401);

        expect(response.body.error).toBe("invalid_client");
        expect(response.body.error_description).toBe("client_not_found");
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
