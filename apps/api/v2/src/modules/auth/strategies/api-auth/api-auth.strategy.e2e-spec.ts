import appConfig from "@/config/app";
import { ApiKeyRepository } from "@/modules/api-key/api-key-repository";
import { DeploymentsRepository } from "@/modules/deployments/deployments.repository";
import { DeploymentsService } from "@/modules/deployments/deployments.service";
import { JwtService } from "@/modules/jwt/jwt.service";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { ProfilesModule } from "@/modules/profiles/profiles.module";
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
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { TokensRepositoryFixture } from "test/fixtures/repository/tokens.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { MockedRedisService } from "test/mocks/mock-redis-service";

import { X_CAL_CLIENT_ID, X_CAL_SECRET_KEY } from "@calcom/platform-constants";

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
  let profilesRepositoryFixture: ProfileRepositoryFixture;

  const validApiKeyEmail = "api-key-user-email@example.com";
  const validAccessTokenEmail = "access-token-user-email@example.com";
  const validOAuthEmail = "oauth-user@example.com";

  let validApiKeyUser: User;
  let validAccessTokenUser: User;
  let validOAuthUser: User;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [appConfig],
        }),
        ProfilesModule,
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
    profilesRepositoryFixture = new ProfileRepositoryFixture(module);
    organization = await teamRepositoryFixture.create({ name: "organization" });
    validApiKeyUser = await userRepositoryFixture.create({
      email: validApiKeyEmail,
    });
    validAccessTokenUser = await userRepositoryFixture.create({
      email: validAccessTokenEmail,
    });

    validOAuthUser = await userRepositoryFixture.create({
      email: validOAuthEmail,
    });

    await profilesRepositoryFixture.create({
      uid: "asd-asd",
      username: validOAuthEmail,
      user: { connect: { id: validOAuthUser.id } },
      organization: { connect: { id: organization.id } },
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

      const user = await strategy.accessTokenStrategy(accessToken);
      expect(user).toBeDefined();
      expect(user?.id).toEqual(validAccessTokenUser.id);
    });

    it("should return user associated with valid api key", async () => {
      const now = new Date();
      now.setDate(now.getDate() + 1);
      const { keyString } = await apiKeysRepositoryFixture.createApiKey(validApiKeyUser.id, now);

      const user = await strategy.apiKeyStrategy(keyString);
      expect(user).toBeDefined();
      expect(user?.id).toEqual(validApiKeyUser.id);
    });

    it("should return user associated with valid OAuth client", async () => {
      const user = await strategy.oAuthClientStrategy(oAuthClient.id, oAuthClient.secret);
      expect(user).toBeDefined();
      expect(user.id).toEqual(validOAuthUser.id);
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

    it("should throw 401 if OAuth ID is invalid", async () => {
      const context: ExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              [X_CAL_CLIENT_ID]: `${oAuthClient.id}gibberish`,
              [X_CAL_SECRET_KEY]: `secret`,
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

    it("should throw 401 if OAuth secret is invalid", async () => {
      const context: ExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              [X_CAL_CLIENT_ID]: `${oAuthClient.id}`,
              [X_CAL_SECRET_KEY]: `gibberish`,
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

    it("should throw 401 if request does not contain Bearer token nor OAuth client credentials", async () => {
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

  afterAll(async () => {
    await oAuthClientRepositoryFixture.delete(oAuthClient.id);
    await userRepositoryFixture.delete(validApiKeyUser.id);
    await userRepositoryFixture.delete(validAccessTokenUser.id);
    await userRepositoryFixture.delete(validOAuthUser.id);
    await teamRepositoryFixture.delete(organization.id);
    module.close();
  });
});
