import appConfig from "@/config/app";
import { ApiKeyRepository } from "@/modules/api-key/api-key-repository";
import { DeploymentsRepository } from "@/modules/deployments/deployments.repository";
import { DeploymentsService } from "@/modules/deployments/deployments.service";
import { JwtService } from "@/modules/jwt/jwt.service";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { ExecutionContext, HttpException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConfigModule } from "@nestjs/config";
import { JwtService as NestJwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { PlatformOAuthClient, Team, User } from "@prisma/client";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { TokensRepositoryFixture } from "test/fixtures/repository/tokens.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { MockedRedisService } from "test/mocks/mock-redis-service";

import { ApiAuthStrategy } from "./api-auth.strategy";

describe("ApiAuthStrategy", () => {
  let strategy: ApiAuthStrategy;
  let userRepositoryFixture: UserRepositoryFixture;
  let tokensRepositoryFixture: TokensRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let organization: Team;
  let oAuthClient: PlatformOAuthClient;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let oAuthClientRepositoryFixture: OAuthClientRepositoryFixture;
  const validApiKeyEmail = "api-key-user-email@example.com";
  const validAccessTokenEmail = "access-token-user-email@example.com";
  let validApiKeyUser: User;
  let validAccessTokenUser: User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [appConfig],
        }),
      ],
      providers: [
        MockedRedisService,
        ApiAuthStrategy,
        ConfigService,
        OAuthFlowService,
        UsersRepository,
        ApiKeyRepository,
        DeploymentsService,
        OAuthClientRepository,
        PrismaReadService,
        PrismaWriteService,
        TokensRepository,
        JwtService,
        DeploymentsRepository,
        NestJwtService,
      ],
    }).compile();

    strategy = module.get<ApiAuthStrategy>(ApiAuthStrategy);
    userRepositoryFixture = new UserRepositoryFixture(module);
    tokensRepositoryFixture = new TokensRepositoryFixture(module);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(module);
    teamRepositoryFixture = new TeamRepositoryFixture(module);
    oAuthClientRepositoryFixture = new OAuthClientRepositoryFixture(module);
    organization = await teamRepositoryFixture.create({ name: "organization" });
    validApiKeyUser = await userRepositoryFixture.create({
      email: validApiKeyEmail,
    });
    validAccessTokenUser = await userRepositoryFixture.create({
      email: validAccessTokenEmail,
    });
    const data = {
      logo: "logo-url",
      name: "name",
      redirectUris: ["http://localhost:3000"],
      permissions: 32,
    };
    oAuthClient = await oAuthClientRepositoryFixture.create(organization.id, data, "secret");
  });

  describe("authenticate with strategy", () => {
    it("should return user associated with valid access token", async () => {
      const { accessToken } = await tokensRepositoryFixture.createTokens(
        validAccessTokenUser.id,
        oAuthClient.id
      );

      const context: ExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              authorization: `Bearer ${accessToken}`,
            },
            get: (key: string) =>
              ({ Authorization: `Bearer ${accessToken}`, origin: "http://localhost:3000" }[key]),
          }),
        }),
      } as ExecutionContext;
      const request = context.switchToHttp().getRequest();

      const user = await strategy.accessTokenStrategy(accessToken);
      await expect(user).toBeDefined();
      if (user) await expect(user.id).toEqual(validAccessTokenUser.id);
    });

    it("should return user associated with valid api key", async () => {
      const now = new Date();
      now.setDate(now.getDate() + 1);
      const { keyString } = await apiKeysRepositoryFixture.createApiKey(validApiKeyUser.id, now);

      const context: ExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              authorization: `Bearer cal_test_${keyString}`,
            },
            get: (key: string) =>
              ({ Authorization: `Bearer cal_test_${keyString}`, origin: "http://localhost:3000" }[key]),
          }),
        }),
      } as ExecutionContext;
      const request = context.switchToHttp().getRequest();

      const user = await strategy.apiKeyStrategy(keyString);
      await expect(user).toBeDefined();
      if (user) expect(user.id).toEqual(validApiKeyUser.id);
    });

    it("should throw 401 if api key is invalid", async () => {
      const context: ExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              authorization: `Bearer cal_test_}`,
            },
            get: (key: string) =>
              ({ Authorization: `Bearer cal_test_badkey1234`, origin: "http://localhost:3000" }[key]),
          }),
        }),
      } as ExecutionContext;
      const request = context.switchToHttp().getRequest();

      try {
        await strategy.authenticate(request);
      } catch (error) {
        if (error instanceof HttpException) {
          expect(error.getStatus()).toEqual(401);
        }
      }
    });

    it("should throw 401 if Authorization header does not contain auth token", async () => {
      const context: ExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            get: (key: string) => ({ Authorization: ``, origin: "http://localhost:3000" }[key]),
          }),
        }),
      } as ExecutionContext;
      const request = context.switchToHttp().getRequest();

      try {
        await strategy.authenticate(request);
      } catch (error) {
        if (error instanceof HttpException) {
          expect(error.getStatus()).toEqual(401);
        }
      }
    });
  });
});
