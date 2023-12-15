import { OAuthClientRepository } from "@/modules/oauth/oauth-client.repository";
import { createMock } from "@golevelup/ts-jest";
import { ExecutionContext } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PlatformOAuthClient } from "@prisma/client";

import { X_CAL_CLIENT_ID, X_CAL_SECRET_KEY } from "@calcom/platform-constants";

import { OAuthClientGuard } from "./oauth-client.guard";

describe("OAuthClientGuard", () => {
  let guard: OAuthClientGuard;
  let oauthRepository: OAuthClientRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthClientGuard,
        {
          provide: OAuthClientRepository,
          useValue: {
            getOAuthClient: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<OAuthClientGuard>(OAuthClientGuard);
    oauthRepository = module.get<OAuthClientRepository>(OAuthClientRepository);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  it("should return true if client ID and secret are valid", async () => {
    const id = "100";
    const secret = "secret";

    const mockContext = createMockExecutionContext({
      [X_CAL_CLIENT_ID]: id,
      [X_CAL_SECRET_KEY]: secret,
    });

    jest.spyOn(oauthRepository, "getOAuthClient").mockResolvedValue({ id, secret, ...OAUTH_CLIENT });

    await expect(guard.canActivate(mockContext)).resolves.toBe(true);
  });

  it("should return false if client ID is invalid", async () => {
    const id = "100";
    const secret = "secret";

    const mockContext = createMockExecutionContext({
      [X_CAL_CLIENT_ID]: id,
      [X_CAL_SECRET_KEY]: secret,
    });

    jest.spyOn(oauthRepository, "getOAuthClient").mockResolvedValue(null);

    await expect(guard.canActivate(mockContext)).resolves.toBe(false);
  });

  it("should return false if secret key is invalid", async () => {
    const id = "id";
    const secret = "secret";

    const mockContext = createMockExecutionContext({
      [X_CAL_CLIENT_ID]: id,
      [X_CAL_SECRET_KEY]: "invalid-secret",
    });

    jest.spyOn(oauthRepository, "getOAuthClient").mockResolvedValue({ id, secret, ...OAUTH_CLIENT });

    await expect(guard.canActivate(mockContext)).resolves.toBe(false);
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

const OAUTH_CLIENT: Omit<PlatformOAuthClient, "id" | "secret"> = {
  name: "name",
  permissions: 32,
  logo: "logo-url",
  organizationId: 1,
  redirect_uris: ["redirect-uri"],
};
