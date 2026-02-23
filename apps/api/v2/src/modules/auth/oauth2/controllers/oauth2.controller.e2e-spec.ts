import { generateSecret } from "@calcom/platform-libraries";
import type { Membership, Team, User } from "@calcom/prisma/client";
import { AccessScope, OAuthClientStatus, OAuthClientType } from "@calcom/prisma/enums";
import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
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

// Mock next-auth/jwt getToken so the NextAuth fallback in ApiAuthStrategy doesn't crash in tests
jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn().mockResolvedValue(null),
}));

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

  describe("User Authenticated (non-owner)", () => {
    let app: INestApplication;
    let moduleRef: TestingModule;

    let userRepositoryFixture: UserRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let membershipRepositoryFixture: MembershipRepositoryFixture;
    let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
    let oAuthClientFixture: OAuth2ClientRepositoryFixture;
    let oAuthService: OAuthService;

    let clientOwner: User;
    let authenticatedUser: User;
    let team: Team;
    let membership: Membership;
    let oAuthClient: { clientId: string };
    let apiKeyString: string;
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
        authenticatedUser.id,
        testRedirectUri,
        scopes,
        undefined,
        teamSlug ?? team.slug
      );
      const redirectUrl = new URL(result.redirectUrl);
      return redirectUrl.searchParams.get("code") as string;
    }

    beforeAll(async () => {
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
      apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
      oAuthClientFixture = new OAuth2ClientRepositoryFixture(moduleRef);
      oAuthService = moduleRef.get(OAuthService);

      clientOwner = await userRepositoryFixture.create({
        email: `oauth2-e2e-owner-${randomString()}@api.com`,
      });

      authenticatedUser = await userRepositoryFixture.create({
        email: `oauth2-e2e-user-${randomString()}@api.com`,
      });

      const { keyString } = await apiKeysRepositoryFixture.createApiKey(authenticatedUser.id, null);
      apiKeyString = keyString;

      team = await teamRepositoryFixture.create({
        name: `oauth2-e2e-team-${randomString()}`,
        slug: `oauth2-e2e-team-${randomString()}`,
      });

      membership = await membershipRepositoryFixture.create({
        user: { connect: { id: authenticatedUser.id } },
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
        userId: clientOwner.id,
      });
    });

    describe("GET /api/v2/auth/oauth2/clients/:clientId", () => {
      describe("Positive tests", () => {
        it("should return OAuth client info for valid client ID", async () => {
          const response = await request(app.getHttpServer())
            .get(`/api/v2/auth/oauth2/clients/${testClientId}`)
            .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
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
            .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
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
      await userRepositoryFixture.delete(authenticatedUser.id);
      await userRepositoryFixture.delete(clientOwner.id);
      await app.close();
    });
  });

  describe("Owner can use non-approved OAuth client", () => {
    let app: INestApplication;
    let moduleRef: TestingModule;

    let userRepositoryFixture: UserRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let membershipRepositoryFixture: MembershipRepositoryFixture;
    let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
    let oAuthClientFixture: OAuth2ClientRepositoryFixture;
    let oAuthService: OAuthService;

    let owner: User;
    let team: Team;
    let membership: Membership;
    let pendingClient: { clientId: string };
    let rejectedClient: { clientId: string };
    let apiKeyString: string;

    const pendingClientId = `test-pending-client-${randomString()}`;
    const rejectedClientId = `test-rejected-client-${randomString()}`;
    const testClientSecret = "test-secret-456";
    const testRedirectUri = "https://example.com/callback";

    /** Generate a user-scoped authorization code (no teamSlug) so the owner's userId is in the token. */
    async function generateAuthCodeForClient(
      clientId: string,
      scopes: AccessScope[] = [AccessScope.READ_BOOKING]
    ): Promise<string> {
      const result = await oAuthService.generateAuthorizationCode(
        clientId,
        owner.id,
        testRedirectUri,
        scopes
      );
      const redirectUrl = new URL(result.redirectUrl);
      return redirectUrl.searchParams.get("code") as string;
    }

    beforeAll(async () => {
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
      apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
      oAuthClientFixture = new OAuth2ClientRepositoryFixture(moduleRef);
      oAuthService = moduleRef.get(OAuthService);

      owner = await userRepositoryFixture.create({
        email: `oauth2-owner-e2e-${randomString()}@api.com`,
      });

      const { keyString } = await apiKeysRepositoryFixture.createApiKey(owner.id, null);
      apiKeyString = keyString;

      team = await teamRepositoryFixture.create({
        name: `oauth2-owner-team-${randomString()}`,
        slug: `oauth2-owner-team-${randomString()}`,
      });

      membership = await membershipRepositoryFixture.create({
        user: { connect: { id: owner.id } },
        team: { connect: { id: team.id } },
        role: "OWNER",
        accepted: true,
      });

      const [hashedSecret] = generateSecret(testClientSecret);

      pendingClient = await oAuthClientFixture.create({
        clientId: pendingClientId,
        name: "Pending OAuth Client",
        redirectUri: testRedirectUri,
        clientSecret: hashedSecret,
        clientType: OAuthClientType.CONFIDENTIAL,
        status: OAuthClientStatus.PENDING,
        userId: owner.id,
      });

      rejectedClient = await oAuthClientFixture.create({
        clientId: rejectedClientId,
        name: "Rejected OAuth Client",
        redirectUri: testRedirectUri,
        clientSecret: hashedSecret,
        clientType: OAuthClientType.CONFIDENTIAL,
        status: OAuthClientStatus.REJECTED,
        userId: owner.id,
      });
    });

    it("should return PENDING client info when authenticated as owner", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/auth/oauth2/clients/${pendingClientId}`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200);

      expect(response.body.status).toBe("success");
      expect(response.body.data.client_id).toBe(pendingClientId);
      expect(response.body.data.name).toBe("Pending OAuth Client");
    });

    it("should exchange authorization code for tokens with PENDING client owned by user", async () => {
      const code = await generateAuthCodeForClient(pendingClientId);

      const response = await request(app.getHttpServer())
        .post("/api/v2/auth/oauth2/token")
        .type("form")
        .send({
          client_id: pendingClientId,
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

    it("should refresh tokens with PENDING client owned by user", async () => {
      const code = await generateAuthCodeForClient(pendingClientId);

      const tokenResponse = await request(app.getHttpServer())
        .post("/api/v2/auth/oauth2/token")
        .type("form")
        .send({
          client_id: pendingClientId,
          grant_type: "authorization_code",
          code,
          client_secret: testClientSecret,
          redirect_uri: testRedirectUri,
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post("/api/v2/auth/oauth2/token")
        .type("form")
        .send({
          client_id: pendingClientId,
          grant_type: "refresh_token",
          refresh_token: tokenResponse.body.refresh_token,
          client_secret: testClientSecret,
        })
        .expect(200);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.token_type).toBe("bearer");
    });

    it("should reject authorization code generation for REJECTED client even as owner", async () => {
      await expect(generateAuthCodeForClient(rejectedClientId)).rejects.toThrow();
    });

    it("should reject token exchange when client becomes rejected", async () => {
      const code = await generateAuthCodeForClient(pendingClientId);

      await oAuthClientFixture.updateStatus(pendingClientId, OAuthClientStatus.REJECTED);

      const response = await request(app.getHttpServer())
        .post("/api/v2/auth/oauth2/token")
        .type("form")
        .send({
          client_id: pendingClientId,
          grant_type: "authorization_code",
          code,
          client_secret: testClientSecret,
          redirect_uri: testRedirectUri,
        })
        .expect(401);

      expect(response.body.error).toBe("unauthorized_client");
      expect(response.body.error_description).toBe("client_rejected");

      await oAuthClientFixture.updateStatus(pendingClientId, OAuthClientStatus.PENDING);
    });

    it("should reject token refresh when client becomes rejected", async () => {
      const code = await generateAuthCodeForClient(pendingClientId);

      const tokenResponse = await request(app.getHttpServer())
        .post("/api/v2/auth/oauth2/token")
        .type("form")
        .send({
          client_id: pendingClientId,
          grant_type: "authorization_code",
          code,
          client_secret: testClientSecret,
          redirect_uri: testRedirectUri,
        })
        .expect(200);

      await oAuthClientFixture.updateStatus(pendingClientId, OAuthClientStatus.REJECTED);

      const response = await request(app.getHttpServer())
        .post("/api/v2/auth/oauth2/token")
        .type("form")
        .send({
          client_id: pendingClientId,
          grant_type: "refresh_token",
          refresh_token: tokenResponse.body.refresh_token,
          client_secret: testClientSecret,
        })
        .expect(401);

      expect(response.body.error).toBe("unauthorized_client");
      expect(response.body.error_description).toBe("client_rejected");

      await oAuthClientFixture.updateStatus(pendingClientId, OAuthClientStatus.PENDING);
    });

    afterAll(async () => {
      await oAuthClientFixture.delete(pendingClient.clientId);
      await oAuthClientFixture.delete(rejectedClient.clientId);
      await membershipRepositoryFixture.delete(membership.id);
      await teamRepositoryFixture.delete(team.id);
      await userRepositoryFixture.delete(owner.id);
      await app.close();
    });
  });
});
