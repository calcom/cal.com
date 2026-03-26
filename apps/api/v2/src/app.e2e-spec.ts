import { X_CAL_CLIENT_ID, X_CAL_SECRET_KEY } from "@calcom/platform-constants";
import type { PlatformOAuthClient, RateLimit, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { RateLimitRepositoryFixture } from "test/fixtures/repository/rate-limit.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { CustomThrottlerGuard } from "@/lib/throttler-guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("AppController", () => {
  describe("Rate limiting", () => {
    let app: INestApplication;
    let userRepositoryFixture: UserRepositoryFixture;
    let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
    let rateLimitRepositoryFixture: RateLimitRepositoryFixture;
    const userEmail = `app-rate-limits-user-${randomString()}@api.com`;
    let user: User;

    let organization: Team;
    let oAuthClient: PlatformOAuthClient;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let profilesRepositoryFixture: ProfileRepositoryFixture;
    let membershipRepositoryFixture: MembershipRepositoryFixture;

    let apiKeyString: string;

    let rateLimit: RateLimit;
    let apiKeyStringWithRateLimit: string;

    let apiKeyStringWithMultipleLimits: string;
    let firstRateLimitWithMultipleLimits: RateLimit;
    let secondRateLimitWithMultipleLimits: RateLimit;

    const mockDefaultLimit = 5;
    const mockDefaultTtl = 2500;
    const mockDefaultBlockDuration = 5000;

    beforeEach(async () => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, TokensModule, SchedulesModule_2024_04_15],
      }).compile();

      jest.spyOn(CustomThrottlerGuard.prototype, "getDefaultLimit").mockReturnValue(mockDefaultLimit);
      jest.spyOn(CustomThrottlerGuard.prototype, "getDefaultTtl").mockReturnValue(mockDefaultTtl);
      jest
        .spyOn(CustomThrottlerGuard.prototype, "getDefaultBlockDuration")
        .mockReturnValue(mockDefaultBlockDuration);

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
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

      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      organization = await organizationsRepositoryFixture.create({
        name: `app-rate-limits-organization-${randomString()}`,
      });
      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      oAuthClient = await createOAuthClient(organization.id);
      profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
      await profilesRepositoryFixture.create({
        uid: "asd-asd",
        username: userEmail,
        user: { connect: { id: user.id } },
        organization: { connect: { id: organization.id } },
      });

      membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      await membershipRepositoryFixture.create({
        user: { connect: { id: user.id } },
        team: { connect: { id: organization.id } },
        role: "OWNER",
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

    it(
      "api key with default rate limit - should enforce rate limits and reset after block duration",
      async () => {
        const limit = mockDefaultLimit;
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
      "non api key with default rate limit - should enforce rate limits and reset after block duration",
      async () => {
        const limit = mockDefaultLimit;
        const blockDuration = mockDefaultBlockDuration;

        for (let i = 1; i <= limit; i++) {
          const response = await request(app.getHttpServer())
            .get("/v2/me")
            .set(X_CAL_CLIENT_ID, oAuthClient.id)
            .set(X_CAL_SECRET_KEY, oAuthClient.secret)
            .expect(200);

          expect(response.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
          expect(response.headers["x-ratelimit-remaining-default"]).toBe((limit - i).toString());
          expect(Number(response.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
        }

        const blockedResponse = await request(app.getHttpServer())
          .get("/v2/me")
          .set(X_CAL_CLIENT_ID, oAuthClient.id)
          .set(X_CAL_SECRET_KEY, oAuthClient.secret)
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
          .set(X_CAL_SECRET_KEY, oAuthClient.secret)
          .expect(200);

        expect(afterBlockResponse.headers["x-ratelimit-limit-default"]).toBe(limit.toString());
        expect(afterBlockResponse.headers["x-ratelimit-remaining-default"]).toBe((limit - 1).toString());
        expect(Number(afterBlockResponse.headers["x-ratelimit-reset-default"])).toBeGreaterThan(0);
      },
      15 * 1000
    );

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(userEmail);
      await organizationsRepositoryFixture.delete(organization.id);
      await app.close();
    });
  });
});
