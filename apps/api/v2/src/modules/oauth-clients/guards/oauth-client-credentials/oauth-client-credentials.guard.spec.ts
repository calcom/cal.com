import { AppModule } from "@/app.module";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { createMock } from "@golevelup/ts-jest";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PlatformOAuthClient, Team } from "@prisma/client";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";

import { X_CAL_SECRET_KEY } from "@calcom/platform-constants";

import { OAuthClientCredentialsGuard } from "./oauth-client-credentials.guard";

describe("OAuthClientCredentialsGuard", () => {
  let guard: OAuthClientCredentialsGuard;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let oauthClient: PlatformOAuthClient;
  let organization: Team;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule, OAuthClientModule],
    }).compile();

    guard = module.get<OAuthClientCredentialsGuard>(OAuthClientCredentialsGuard);
    teamRepositoryFixture = new TeamRepositoryFixture(module);
    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(module);

    organization = await teamRepositoryFixture.create({ name: "organization" });

    const data = {
      logo: "logo-url",
      name: "name",
      redirectUris: ["redirect-uri"],
      permissions: 32,
    };
    const secret = "secret";

    oauthClient = await oauthClientRepositoryFixture.create(organization.id, data, secret);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
    expect(oauthClient).toBeDefined();
  });

  it("should return true if client ID and secret are valid", async () => {
    const mockContext = createMockExecutionContext(
      { [X_CAL_SECRET_KEY]: oauthClient.secret },
      { clientId: oauthClient.id }
    );

    await expect(guard.canActivate(mockContext)).resolves.toBe(true);
  });

  it("should return false if client ID is invalid", async () => {
    const mockContext = createMockExecutionContext(
      { [X_CAL_SECRET_KEY]: oauthClient.secret },
      { clientId: "invalid id" }
    );

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });

  it("should return false if secret key is invalid", async () => {
    const mockContext = createMockExecutionContext(
      { [X_CAL_SECRET_KEY]: "invalid secret" },
      { clientId: oauthClient.id }
    );

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });

  afterAll(async () => {
    await oauthClientRepositoryFixture.delete(oauthClient.id);
    await teamRepositoryFixture.delete(organization.id);
  });

  function createMockExecutionContext(
    headers: Record<string, string>,
    params: Record<string, string>
  ): ExecutionContext {
    return createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          params,
          get: (headerName: string) => headers[headerName],
        }),
      }),
    });
  }
});
