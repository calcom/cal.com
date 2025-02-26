import { AppModule } from "@/app.module";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { CustomThrottlerGuard } from "@/lib/throttler/throttler-guard";
import { CreateManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/create-managed-user.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { RateLimitRepositoryFixture } from "test/fixtures/repository/rate-limit.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import { X_CAL_CLIENT_ID } from "@calcom/platform-constants";
import { User, PlatformOAuthClient, Team, RateLimit } from "@calcom/prisma/client";

describe("Global throttler rate limiting", () => {
  let app: INestApplication;
  let userRepositoryFixture: UserRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let rateLimitRepositoryFixture: RateLimitRepositoryFixture;
  const userEmail = `global-throttler-user-${randomString()}@api.com`;
  let managedUserId: number;
  let user: User;

  let organization: Team;
  let oAuthClient: PlatformOAuthClient;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let profilesRepositoryFixture: ProfileRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;

  let apiKeyString: string;

  let rateLimit: RateLimit;
  let apiKeyStringWithRateLimit: string;

  let apiKeyStringWithMultipleLimits: string;
  let firstRateLimitWithMultipleLimits: RateLimit;
  let secondRateLimitWithMultipleLimits: RateLimit;

  const mockDefaultLimitByTracker = 10;
  const mockDefaultLimit = 5;
  const mockDefaultTtl = 2500;
  const mockDefaultBlockDuration = 5000;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, TokensModule, SchedulesModule_2024_04_15],
    }).compile();

    jest
      .spyOn(CustomThrottlerGuard.prototype, "getDefaultLimitByTracker")
      .mockReturnValue(mockDefaultLimitByTracker);
    jest.spyOn(CustomThrottlerGuard.prototype, "getDefaultLimit").mockReturnValue(mockDefaultLimit);
    jest.spyOn(CustomThrottlerGuard.prototype, "getDefaultTtl").mockReturnValue(mockDefaultTtl);
    jest
      .spyOn(CustomThrottlerGuard.prototype, "getDefaultBlockDuration")
      .mockReturnValue(mockDefaultBlockDuration);

    organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
    organization = await organizationsRepositoryFixture.create({
      name: "ecorp",
      isOrganization: true,
      isPlatform: true,
    });

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    user = await userRepositoryFixture.create({
      email: userEmail,
      username: userEmail,
      organization: { connect: { id: organization.id } },
    });

    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
    const { keyString } = await apiKeysRepositoryFixture.createApiKey(user.id, null);
    apiKeyString = `cal_test_${keyString}`;

    rateLimitRepositoryFixture = new RateLimitRepositoryFixture(moduleRef);
    const { apiKey, keyString: keyStringWithRateLimit } = await apiKeysRepositoryFixture.createApiKey(
      user.id,
      null
    );
    apiKeyStringWithRateLimit = `cal_test_${keyStringWithRateLimit}`;
    rateLimit = await rateLimitRepositoryFixture.createRateLimit("long", apiKey.id, 2000, 3, 4000);

    const { apiKey: apiKeyWithMultipleLimits, keyString: keyStringWithMultipleLimits } =
      await apiKeysRepositoryFixture.createApiKey(user.id, null);
    apiKeyStringWithMultipleLimits = `cal_test_${keyStringWithMultipleLimits}`;
    firstRateLimitWithMultipleLimits = await rateLimitRepositoryFixture.createRateLimit(
      "short",
      apiKeyWithMultipleLimits.id,
      1000,
      2,
      2000
    );
    secondRateLimitWithMultipleLimits = await rateLimitRepositoryFixture.createRateLimit(
      "long",
      apiKeyWithMultipleLimits.id,
      2000,
      3,
      4000
    );

    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    oAuthClient = await createOAuthClient(organization.id);
    profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

    await profilesRepositoryFixture.create({
      uid: "asd-asd",
      username: userEmail,
      user: { connect: { id: user.id } },
      organization: { connect: { id: organization.id } },
    });

    await membershipsRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: user.id } },
      team: { connect: { id: organization.id } },
      accepted: true,
    });

    app = moduleRef.createNestApplication();
    await app.init();
  });

  async function createOAuthClient(organizationId: number) {
    const data = {
      logo: "logo-url",
      name: "name",
      redirectUris: ["http://localhost:5555"],
      permissions: 1023,
    };
    const secret = "secret";

    const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
    return client;
  }

  describe("api key", () => {
    it(
      "api key with default rate limit - should enforce rate limits and reset after block duration",
      async () => {
        const limit = mockDefaultLimitByTracker;
        const blockDuration = mockDefaultBlockDuration;

        for (let i = 1; i <= limit; i++) {
          const response = await request(app.getHttpServer())
            .get("/v2/me")
            .set({ Authorization: `Bearer ${apiKeyString}` })
            .expect(200);

          expect(response.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
          expect(response.headers["x-ratelimit-remaining-default"]).toBe((limit - i).toString());
          expect(Number(response.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
        }

        const blockedResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set("Authorization", `Bearer ${apiKeyString}`)
          .expect(429);

        expect(blockedResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(blockedResponse.headers["x-ratelimit-remaining-default"]).toBe("0");
        expect(Number(blockedResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThanOrEqual(
          blockDuration / 1000
        );

        await new Promise((resolve) => setTimeout(resolve, blockDuration));

        const afterBlockResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set("Authorization", `Bearer ${apiKeyString}`)
          .expect(200);

        expect(afterBlockResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(afterBlockResponse.headers["x-ratelimit-remaining-default"]).toBe((limit - 1).toString());
        expect(Number(afterBlockResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
      },
      15 * 1000
    );

    it(
      "api key with custom rate limit - should enforce rate limits and reset after block duration",
      async () => {
        const limit = rateLimit.limit;
        const blockDuration = rateLimit.blockDuration;
        const name = rateLimit.name;

        for (let i = 1; i <= limit; i++) {
          const response = await request(app.getHttpServer())
            .get("/v2/me")
            .set({ Authorization: `Bearer ${apiKeyStringWithRateLimit}` })
            .expect(200);

          expect(response.headers[`x-ratelimit-limit-${name}`]).toBe(limit.toString());
          expect(response.headers[`x-ratelimit-remaining-${name}`]).toBe((limit - i).toString());
          expect(Number(response.headers[`x-ratelimit-reset-${name}`])).toBeGreaterThan(0);
        }

        const blockedResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set("Authorization", `Bearer ${apiKeyStringWithRateLimit}`)
          .expect(429);

        expect(blockedResponse.headers[`x-ratelimit-limit-${name}`]).toBe(limit.toString());
        expect(blockedResponse.headers[`x-ratelimit-remaining-${name}`]).toBe("0");
        expect(Number(blockedResponse.headers[`x-ratelimit-reset-${name}`])).toBeGreaterThanOrEqual(
          blockDuration / 1000
        );

        await new Promise((resolve) => setTimeout(resolve, blockDuration));

        const afterBlockResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set("Authorization", `Bearer ${apiKeyStringWithRateLimit}`)
          .expect(200);

        expect(afterBlockResponse.headers[`x-ratelimit-limit-${name}`]).toBe(limit.toString());
        expect(afterBlockResponse.headers[`x-ratelimit-remaining-${name}`]).toBe((limit - 1).toString());
        expect(Number(afterBlockResponse.headers[`x-ratelimit-reset-${name}`])).toBeGreaterThan(0);
      },
      15 * 1000
    );

    it(
      "api key with multiple rate limits - should enforce both short and long rate limits",
      async () => {
        const shortLimit = firstRateLimitWithMultipleLimits.limit;
        const longLimit = secondRateLimitWithMultipleLimits.limit;
        const shortName = firstRateLimitWithMultipleLimits.name;
        const longName = secondRateLimitWithMultipleLimits.name;
        const shortBlock = firstRateLimitWithMultipleLimits.blockDuration;
        const longBlock = secondRateLimitWithMultipleLimits.blockDuration;

        let requestsMade = 0;
        // note(Lauris): exhaust short limit to have remaining 0 for it
        for (let i = 1; i <= shortLimit; i++) {
          const response = await request(app.getHttpServer())
            .get("/v2/me")
            .set({ Authorization: `Bearer ${apiKeyStringWithMultipleLimits}` })
            .expect(200);

          requestsMade++;

          expect(response.headers[`x-ratelimit-limit-${shortName}`]).toBe(shortLimit.toString());
          expect(response.headers[`x-ratelimit-remaining-${shortName}`]).toBe((shortLimit - i).toString());
          expect(Number(response.headers[`x-ratelimit-reset-${shortName}`])).toBeGreaterThan(0);

          expect(response.headers[`x-ratelimit-limit-${longName}`]).toBe(longLimit.toString());
          expect(response.headers[`x-ratelimit-remaining-${longName}`]).toBe((longLimit - i).toString());
          expect(Number(response.headers[`x-ratelimit-reset-${longName}`])).toBeGreaterThan(0);
        }

        // note(Lauris): short limit exhausted, now exhaust long limit to have remaining 0 for it
        for (let i = requestsMade; i < longLimit; i++) {
          const responseAfterShortLimit = await request(app.getHttpServer())
            .get("/v2/me")
            .set({ Authorization: `Bearer ${apiKeyStringWithMultipleLimits}` })
            .expect(200);

          requestsMade++;

          expect(responseAfterShortLimit.headers[`x-ratelimit-limit-${shortName}`]).toBe(
            shortLimit.toString()
          );
          expect(responseAfterShortLimit.headers[`x-ratelimit-remaining-${shortName}`]).toBe("0");
          expect(Number(responseAfterShortLimit.headers[`x-ratelimit-reset-${shortName}`])).toBeGreaterThan(
            0
          );

          expect(responseAfterShortLimit.headers[`x-ratelimit-limit-${longName}`]).toBe(longLimit.toString());
          expect(responseAfterShortLimit.headers[`x-ratelimit-remaining-${longName}`]).toBe(
            (longLimit - requestsMade).toString()
          );
          expect(Number(responseAfterShortLimit.headers[`x-ratelimit-reset-${longName}`])).toBeGreaterThan(0);
        }

        // note(Lauris): both have remaining 0 so now exceed both
        const blockedResponseLong = await request(app.getHttpServer())
          .get("/v2/me")
          .set({ Authorization: `Bearer ${apiKeyStringWithMultipleLimits}` })
          .expect(429);

        expect(blockedResponseLong.headers[`x-ratelimit-limit-${shortName}`]).toBe(shortLimit.toString());
        expect(blockedResponseLong.headers[`x-ratelimit-remaining-${shortName}`]).toBe("0");
        expect(Number(blockedResponseLong.headers[`x-ratelimit-reset-${shortName}`])).toBeGreaterThanOrEqual(
          firstRateLimitWithMultipleLimits.blockDuration / 1000
        );

        expect(blockedResponseLong.headers[`x-ratelimit-limit-${longName}`]).toBe(longLimit.toString());
        expect(blockedResponseLong.headers[`x-ratelimit-remaining-${longName}`]).toBe("0");
        expect(Number(blockedResponseLong.headers[`x-ratelimit-reset-${longName}`])).toBeGreaterThanOrEqual(
          secondRateLimitWithMultipleLimits.blockDuration / 1000
        );

        // note(Lauris): wait for short limit to reset
        await new Promise((resolve) => setTimeout(resolve, shortBlock));
        const responseAfterShortLimitReload = await request(app.getHttpServer())
          .get("/v2/me")
          .set({ Authorization: `Bearer ${apiKeyStringWithMultipleLimits}` })
          .expect(200);
        expect(responseAfterShortLimitReload.headers[`x-ratelimit-limit-${shortName}`]).toBe(
          shortLimit.toString()
        );
        expect(responseAfterShortLimitReload.headers[`x-ratelimit-remaining-${shortName}`]).toBe(
          (shortLimit - 1).toString()
        );
        expect(
          Number(responseAfterShortLimitReload.headers[`x-ratelimit-reset-${shortName}`])
        ).toBeGreaterThan(0);
        expect(responseAfterShortLimitReload.headers[`x-ratelimit-limit-${longName}`]).toBe(
          longLimit.toString()
        );
        expect(responseAfterShortLimitReload.headers[`x-ratelimit-remaining-${longName}`]).toBe(
          (longLimit - requestsMade).toString()
        );
        expect(
          Number(responseAfterShortLimitReload.headers[`x-ratelimit-reset-${longName}`])
        ).toBeGreaterThan(0);

        // note(Lauris): wait for long limit to reset
        await new Promise((resolve) => setTimeout(resolve, longBlock));
        const responseAfterLongLimitReload = await request(app.getHttpServer())
          .get("/v2/me")
          .set({ Authorization: `Bearer ${apiKeyStringWithMultipleLimits}` })
          .expect(200);
        expect(responseAfterLongLimitReload.headers[`x-ratelimit-limit-${shortName}`]).toBe(
          shortLimit.toString()
        );
        expect(responseAfterLongLimitReload.headers[`x-ratelimit-remaining-${shortName}`]).toBe(
          (shortLimit - 1).toString()
        );
        expect(
          Number(responseAfterLongLimitReload.headers[`x-ratelimit-reset-${shortName}`])
        ).toBeGreaterThan(0);
        expect(responseAfterLongLimitReload.headers[`x-ratelimit-limit-${longName}`]).toBe(
          longLimit.toString()
        );
        expect(responseAfterLongLimitReload.headers[`x-ratelimit-remaining-${longName}`]).toBe(
          (longLimit - 1).toString()
        );
        expect(Number(responseAfterLongLimitReload.headers[`x-ratelimit-reset-${longName}`])).toBeGreaterThan(
          0
        );
      },
      30 * 1000
    );

    it(
      "invalid api key - should enforce default rate limits and reset after block duration",
      async () => {
        const limit = mockDefaultLimit;
        const blockDuration = mockDefaultBlockDuration;

        const invalidApiKey = `cal_test_invalid_key-${randomString()}`;

        for (let i = 1; i <= limit; i++) {
          const response = await request(app.getHttpServer())
            .get("/v2/me")
            .set({ Authorization: `Bearer ${invalidApiKey}` })
            .expect((res) => {
              expect(res.status).not.toBe(429);
            });

          expect(response.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
          expect(response.headers["x-ratelimit-remaining-default"]).toBe((limit - i).toString());
          expect(Number(response.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
        }

        const blockedResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set({ Authorization: `Bearer ${invalidApiKey}` })
          .expect(429);

        expect(blockedResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(blockedResponse.headers["x-ratelimit-remaining-default"]).toBe("0");
        expect(Number(blockedResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThanOrEqual(
          blockDuration / 1000
        );

        await new Promise((resolve) => setTimeout(resolve, blockDuration));

        const afterBlockResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set({ Authorization: `Bearer ${invalidApiKey}` })
          .expect((res) => {
            expect(res.status).not.toBe(429);
          });

        expect(afterBlockResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(afterBlockResponse.headers["x-ratelimit-remaining-default"]).toBe((limit - 1).toString());
        expect(Number(afterBlockResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
      },
      15 * 1000
    );
  });

  describe("OAuth client", () => {
    it(
      "valid OAuth client - should enforce OAuth client rate limits and reset after block duration",
      async () => {
        const limit = mockDefaultLimitByTracker;
        const blockDuration = mockDefaultBlockDuration;

        for (let i = 1; i <= limit; i++) {
          const response = await request(app.getHttpServer())
            .get("/v2/me")
            .set(X_CAL_CLIENT_ID, oAuthClient.id)
            .expect((res) => {
              expect(res.status).not.toBe(429);
            });

          expect(response.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
          expect(response.headers["x-ratelimit-remaining-default"]).toBe((limit - i).toString());
          expect(Number(response.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
        }

        const blockedResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set(X_CAL_CLIENT_ID, oAuthClient.id)
          .expect(429);

        expect(blockedResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(blockedResponse.headers["x-ratelimit-remaining-default"]).toBe("0");
        expect(Number(blockedResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThanOrEqual(
          blockDuration / 1000
        );

        await new Promise((resolve) => setTimeout(resolve, blockDuration));

        const afterBlockResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set(X_CAL_CLIENT_ID, oAuthClient.id)
          .expect((res) => {
            expect(res.status).not.toBe(429);
          });

        expect(afterBlockResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(afterBlockResponse.headers["x-ratelimit-remaining-default"]).toBe((limit - 1).toString());
        expect(Number(afterBlockResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
      },
      15 * 1000
    );

    it(
      "invalid OAuth client - should enforce default rate limits and reset after block duration",
      async () => {
        const limit = mockDefaultLimit;
        const blockDuration = mockDefaultBlockDuration;
        const invalidOAuthClientId = `invalidOAuthClientId-${randomString()}`;

        for (let i = 1; i <= limit; i++) {
          const response = await request(app.getHttpServer())
            .get("/v2/me")
            .set(X_CAL_CLIENT_ID, invalidOAuthClientId)
            .expect((res) => {
              expect(res.status).not.toBe(429);
            });

          expect(response.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
          expect(response.headers["x-ratelimit-remaining-default"]).toBe((limit - i).toString());
          expect(Number(response.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
        }

        const blockedResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set(X_CAL_CLIENT_ID, invalidOAuthClientId)
          .expect(429);

        expect(blockedResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(blockedResponse.headers["x-ratelimit-remaining-default"]).toBe("0");
        expect(Number(blockedResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThanOrEqual(
          blockDuration / 1000
        );

        await new Promise((resolve) => setTimeout(resolve, blockDuration));

        const afterBlockResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set(X_CAL_CLIENT_ID, invalidOAuthClientId)
          .expect((res) => {
            expect(res.status).not.toBe(429);
          });

        expect(afterBlockResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(afterBlockResponse.headers["x-ratelimit-remaining-default"]).toBe((limit - 1).toString());
        expect(Number(afterBlockResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
      },
      15 * 1000
    );
  });

  describe("Access token", () => {
    it(
      "valid access token - should enforce access token rate limits and reset after block duration",
      async () => {
        const limit = mockDefaultLimitByTracker;
        const blockDuration = mockDefaultBlockDuration;

        const requestBody: CreateManagedUserInput = {
          email: `global-throttler-managed-${randomString()}@api.com`,
          timeZone: "Europe/Rome",
          weekStart: "Monday",
          timeFormat: 24,
          name: "Alice Smith",
        };

        const response = await request(app.getHttpServer())
          .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
          .set("x-cal-secret-key", oAuthClient.secret)
          .send(requestBody)
          .expect(201);

        const responseBody: CreateManagedUserOutput = response.body;

        const validAccessToken = responseBody.data.accessToken;
        const responseManagedUserId = responseBody.data.user.id;
        expect(validAccessToken).toBeDefined();
        expect(responseManagedUserId).toBeDefined();
        managedUserId = responseManagedUserId;

        for (let i = 1; i <= limit; i++) {
          const response = await request(app.getHttpServer())
            .get("/v2/me")
            .set({ Authorization: `Bearer ${validAccessToken}` })
            .expect((res) => {
              expect(res.status).not.toBe(429);
            });

          expect(response.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
          expect(response.headers["x-ratelimit-remaining-default"]).toBe((limit - i).toString());
          expect(Number(response.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
        }

        const blockedResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set({ Authorization: `Bearer ${validAccessToken}` })
          .expect(429);

        expect(blockedResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(blockedResponse.headers["x-ratelimit-remaining-default"]).toBe("0");
        expect(Number(blockedResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThanOrEqual(
          blockDuration / 1000
        );

        await new Promise((resolve) => setTimeout(resolve, blockDuration));

        const afterBlockResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set({ Authorization: `Bearer ${validAccessToken}` })
          .expect((res) => {
            expect(res.status).not.toBe(429);
          });

        expect(afterBlockResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(afterBlockResponse.headers["x-ratelimit-remaining-default"]).toBe((limit - 1).toString());
        expect(Number(afterBlockResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
      },
      15 * 1000
    );

    it(
      "invalid access token - should enforce default rate limits and reset after block duration",
      async () => {
        const limit = mockDefaultLimit;
        const blockDuration = mockDefaultBlockDuration;
        const invalidAccessToken = `invalidAccessToken-${randomString()}`;

        for (let i = 1; i <= limit; i++) {
          const response = await request(app.getHttpServer())
            .get("/v2/me")
            .set({ Authorization: `Bearer ${invalidAccessToken}` })
            .expect((res) => {
              expect(res.status).not.toBe(429);
            });

          expect(response.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
          expect(response.headers["x-ratelimit-remaining-default"]).toBe((limit - i).toString());
          expect(Number(response.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
        }

        const blockedResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set({ Authorization: `Bearer ${invalidAccessToken}` })
          .expect(429);

        expect(blockedResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(blockedResponse.headers["x-ratelimit-remaining-default"]).toBe("0");
        expect(Number(blockedResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThanOrEqual(
          blockDuration / 1000
        );

        await new Promise((resolve) => setTimeout(resolve, blockDuration));

        const afterBlockResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set({ Authorization: `Bearer ${invalidAccessToken}` })
          .expect((res) => {
            expect(res.status).not.toBe(429);
          });

        expect(afterBlockResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(afterBlockResponse.headers["x-ratelimit-remaining-default"]).toBe((limit - 1).toString());
        expect(Number(afterBlockResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
      },
      15 * 1000
    );
  });

  describe("No auth", () => {
    it(
      "no auth - should enforce default rate limits and reset after block duration",
      async () => {
        const limit = mockDefaultLimit;
        const blockDuration = mockDefaultBlockDuration;

        for (let i = 1; i <= limit; i++) {
          const response = await request(app.getHttpServer())
            .get("/v2/me")
            .expect((res) => {
              expect(res.status).not.toBe(429);
            });

          expect(response.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
          expect(response.headers["x-ratelimit-remaining-default"]).toBe((limit - i).toString());
          expect(Number(response.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
        }

        const blockedResponse = await request(app.getHttpServer()).get("/v2/me").expect(429);

        expect(blockedResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(blockedResponse.headers["x-ratelimit-remaining-default"]).toBe("0");
        expect(Number(blockedResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThanOrEqual(
          blockDuration / 1000
        );

        await new Promise((resolve) => setTimeout(resolve, blockDuration));

        const afterBlockResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .expect((res) => {
            expect(res.status).not.toBe(429);
          });

        expect(afterBlockResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(afterBlockResponse.headers["x-ratelimit-remaining-default"]).toBe((limit - 1).toString());
        expect(Number(afterBlockResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
      },
      15 * 1000
    );
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(userEmail);
    await userRepositoryFixture.delete(managedUserId);
    await organizationsRepositoryFixture.delete(organization.id);
    await app.close();
  });
});
