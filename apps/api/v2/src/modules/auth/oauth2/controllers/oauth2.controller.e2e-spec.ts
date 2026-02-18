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
import { OAuthService } from "@/lib/services/oauth.service";
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

    it("POST /v2/auth/oauth2/token should return 401 without auth", () => {
      return request(appWithoutAuth.getHttpServer())
        .post("/api/v2/auth/oauth2/token")
        .type("form")
        .send({
          client_id: "test-client-id",
          grant_type: "authorization_code",
          code: "test-code",
          client_secret: "test-secret",
          redirect_uri: "https://example.com/callback",
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
    let oAuthService: OAuthService;

    let user: User;
    let team: Team;
    let membership: Membership;
    let oAuthClient: { clientId: string };
    let refreshToken: string;

    const testClientId = `test-oauth-client-${randomString()}`;
    const testClientSecret = "test-secret-123";
    const testRedirectUri = "https://example.com/callback";

    /** Generate an authorization code directly via the service (bypasses HTTP layer). */
    async function generateAuthCode(
      scopes: AccessScope[] = [AccessScope.READ_BOOKING],
      teamSlug?: string
    ): Promise<string> {
      const result = await oAuthService.generateAuthorizationCode(
        testClientId,
        user.id,
        testRedirectUri,
        scopes,
        undefined,
        teamSlug ?? team.slug
      );
      const redirectUrl = new URL(result.redirectUrl);
      return redirectUrl.searchParams.get("code") as string;
    }

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
      oAuthService = moduleRef.get(OAuthService);

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
      describe("Positive tests", () => {
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
      });

      describe("Negative tests", () => {
        it("should return 404 for non-existent client ID", async () => {
          await request(app.getHttpServer())
            .get("/api/v2/auth/oauth2/clients/non-existent-client-id")
            .expect(404);
        });
      });
    });

    describe("POST /api/v2/auth/oauth2/token (authorization_code grant)", () => {
      describe("Positive tests", () => {
        it("should exchange authorization code for tokens", async () => {
          const authorizationCode = await generateAuthCode([
            AccessScope.READ_BOOKING,
            AccessScope.READ_PROFILE,
          ]);

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
          const code = await generateAuthCode();

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

        it("should exchange authorization code for tokens with application/x-www-form-urlencoded body", async () => {
          const code = await generateAuthCode();

          const response = await request(app.getHttpServer())
            .post("/api/v2/auth/oauth2/token")
            .type("form")
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
          expect(response.body.expires_in).toBe(1800);
        });
      });

      describe("Negative tests", () => {
        it("should return 400 with RFC 6749 error for invalid/used authorization code", async () => {
          const code = await generateAuthCode();

          // Use the code once
          await request(app.getHttpServer())
            .post("/api/v2/auth/oauth2/token")
            .type("form")
            .send({
              client_id: testClientId,
              grant_type: "authorization_code",
              code,
              client_secret: testClientSecret,
              redirect_uri: testRedirectUri,
            })
            .expect(200);

          // Try to use the same code again
          const response = await request(app.getHttpServer())
            .post("/api/v2/auth/oauth2/token")
            .type("form")
            .send({
              client_id: testClientId,
              grant_type: "authorization_code",
              code,
              client_secret: testClientSecret,
              redirect_uri: testRedirectUri,
            })
            .expect(400);

          expect(response.body.error).toBe("invalid_grant");
          expect(response.body.error_description).toBe("code_invalid_or_expired");
        });

        it("should return 401 for invalid client secret", async () => {
          const code = await generateAuthCode();

          const response = await request(app.getHttpServer())
            .post("/api/v2/auth/oauth2/token")
            .type("form")
            .send({
              client_id: testClientId,
              grant_type: "authorization_code",
              code,
              client_secret: "wrong-secret",
              redirect_uri: testRedirectUri,
            })
            .expect(401);

          expect(response.body.error).toBe("invalid_client");
          expect(response.body.error_description).toBe("invalid_client_credentials");
        });

        it("should return 400 for invalid grant type", async () => {
          const response = await request(app.getHttpServer())
            .post("/api/v2/auth/oauth2/token")
            .type("form")
            .send({
              client_id: testClientId,
              grant_type: "invalid_grant",
              code: "some-code",
              redirect_uri: testRedirectUri,
            })
            .expect(400);

          expect(response.body.error).toBe("invalid_request");
          expect(response.body.error_description).toBe(
            "grant_type must be 'authorization_code' or 'refresh_token'"
          );
        });

        it("should return 401 with RFC 6749 error for non-existent client_id", async () => {
          const code = await generateAuthCode();

          const response = await request(app.getHttpServer())
            .post("/api/v2/auth/oauth2/token")
            .type("form")
            .send({
              client_id: "non-existent-client-id",
              grant_type: "authorization_code",
              code,
              client_secret: testClientSecret,
              redirect_uri: testRedirectUri,
            })
            .expect(401);

          expect(response.body.error).toBe("invalid_client");
          expect(response.body.error_description).toBe("client_not_found");
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
    });

    describe("POST /api/v2/auth/oauth2/token (refresh_token grant)", () => {
      describe("Positive tests", () => {
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
      });

      describe("Negative tests", () => {
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

        it("should return 401 for invalid client secret", async () => {
          const response = await request(app.getHttpServer())
            .post("/api/v2/auth/oauth2/token")
            .type("form")
            .send({
              client_id: testClientId,
              grant_type: "refresh_token",
              refresh_token: refreshToken,
              client_secret: "wrong-secret",
            })
            .expect(401);

          expect(response.body.error).toBe("invalid_client");
          expect(response.body.error_description).toBe("invalid_client_credentials");
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
