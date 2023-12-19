import { AppModule } from "@/app.module";
import { OAuthClientModule } from "@/modules/oauth/oauth-client.module";
import { createMock } from "@golevelup/ts-jest";
import { ExecutionContext, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PlatformOAuthClient } from "@prisma/client";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";

import { X_CAL_CLIENT_ID, X_CAL_SECRET_KEY } from "@calcom/platform-constants";

import { OAuthClientGuard } from "./oauth-client.guard";

describe("OAuthClientGuard", () => {
  let guard: OAuthClientGuard;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let oauthClient: PlatformOAuthClient;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule, OAuthClientModule],
    }).compile();

    guard = module.get<OAuthClientGuard>(OAuthClientGuard);
    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(module);

    const organizationId = 1;
    const data = {
      logo: "logo-url",
      name: "name",
      redirect_uris: ["redirect-uri"],
      permissions: 32,
    };
    const secret = "secret";

    oauthClient = await oauthClientRepositoryFixture.create(organizationId, data, secret);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
    expect(oauthClient).toBeDefined();
  });

  it("should return true if client ID and secret are valid", async () => {
    const mockContext = createMockExecutionContext({
      [X_CAL_CLIENT_ID]: oauthClient.id,
      [X_CAL_SECRET_KEY]: oauthClient.secret,
    });

    await expect(guard.canActivate(mockContext)).resolves.toBe(true);
  });

  it("should return false if client ID is invalid", async () => {
    const mockContext = createMockExecutionContext({
      [X_CAL_CLIENT_ID]: "invalid id",
      [X_CAL_SECRET_KEY]: oauthClient.secret,
    });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });

  it("should return false if secret key is invalid", async () => {
    const mockContext = createMockExecutionContext({
      [X_CAL_CLIENT_ID]: oauthClient.id,
      [X_CAL_SECRET_KEY]: "invalid secret",
    });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });

  afterAll(async () => {
    await oauthClientRepositoryFixture.delete(oauthClient.id);
  });

  function createMockExecutionContext(headers: Record<string, string>): ExecutionContext {
    return createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
    });
  }
});
