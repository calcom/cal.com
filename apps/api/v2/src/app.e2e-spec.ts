import { AppModule } from "@/app.module";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { getEnv } from "@/env";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { RateLimitRepositoryFixture } from "test/fixtures/repository/rate-limit.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";

import { X_CAL_CLIENT_ID, X_CAL_SECRET_KEY } from "@calcom/platform-constants";
import { User, PlatformOAuthClient, Team, RateLimit } from "@calcom/prisma/client";

describe("AppController", () => {
  describe("Rate limiting", () => {
    let app: INestApplication;
    let userRepositoryFixture: UserRepositoryFixture;
    let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
    let rateLimitRepositoryFixture: RateLimitRepositoryFixture;
    const userEmail = "app-rate-limits-e2e@api.com";
    let user: User;

    let organization: Team;
    let oAuthClient: PlatformOAuthClient;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let profilesRepositoryFixture: ProfileRepositoryFixture;

    let apiKeyString: string;
    let apiKeyStringWithRateLimit: string;
    let rateLimit: RateLimit;

    beforeEach(async () => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, TokensModule, SchedulesModule_2024_04_15],
      }).compile();

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

      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      organization = await organizationsRepositoryFixture.create({ name: "ecorp" });
      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      oAuthClient = await createOAuthClient(organization.id);
      profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
      await profilesRepositoryFixture.create({
        uid: "asd-asd",
        username: userEmail,
        user: { connect: { id: user.id } },
        organization: { connect: { id: organization.id } },
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
        const limit = getEnv("RATE_LIMIT_DEFAULT_LIMIT");
        const blockDuration = getEnv("RATE_LIMIT_DEFAULT_BLOCK_DURATION_MS");

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
      "non api key with default rate limit - should enforce rate limits and reset after block duration",
      async () => {
        const limit = getEnv("RATE_LIMIT_DEFAULT_LIMIT");
        const blockDuration = getEnv("RATE_LIMIT_DEFAULT_BLOCK_DURATION_MS");

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
