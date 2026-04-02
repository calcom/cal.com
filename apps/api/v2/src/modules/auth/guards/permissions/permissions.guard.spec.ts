import { APPS_WRITE, SCHEDULE_READ, SCHEDULE_WRITE } from "@calcom/platform-constants";
import { createMock } from "@golevelup/ts-jest";
import { ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "./permissions.guard";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientsOutputService } from "@/modules/oauth-clients/services/oauth-clients/oauth-clients-output.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { TokensService } from "@/modules/tokens/tokens.service";

describe("PermissionsGuard", () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    reflector = new Reflector();
    guard = new PermissionsGuard(
      reflector,
      createMock<TokensRepository>(),
      createMock<TokensService>(),
      createMock<ConfigService>({
        get: jest.fn().mockImplementation((key: string) => {
          switch (key) {
            case "api.apiKeyPrefix":
              return "cal_";
            default:
              return null;
          }
        }),
      }),
      createMock<OAuthClientRepository>(),
      createMock<OAuthClientsOutputService>({
        transformOAuthClientPermission: jest.fn().mockImplementation((permission: number) => {
          switch (permission) {
            case SCHEDULE_WRITE:
              return "SCHEDULE_WRITE";
            case SCHEDULE_READ:
              return "SCHEDULE_READ";
            case APPS_WRITE:
              return "APPS_WRITE";
            default:
              return "UNKNOWN";
          }
        }),
      })
    );
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  function getMockOAuthClient(permissions: number) {
    return {
      id: "100",
      permissions,
    };
  }

  describe("when access token is missing", () => {
    it("should return false", async () => {
      const mockContext = createMockExecutionContext({});
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE]);
      jest.spyOn(guard, "getOAuthClientByAccessToken").mockResolvedValue(getMockOAuthClient(0));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        "PermissionsGuard - no authentication provided. Provide either authorization bearer token containing managed user access token or oAuth client id in 'x-cal-client-id' header."
      );
    });
  });

  describe("when access token is provided", () => {
    it("should return true for valid permissions", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      jest
        .spyOn(guard, "getOAuthClientByAccessToken")
        .mockResolvedValue(getMockOAuthClient(oAuthClientPermissions));
      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it("should return true for multiple valid permissions", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE, SCHEDULE_READ]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      oAuthClientPermissions |= SCHEDULE_READ;
      jest
        .spyOn(guard, "getOAuthClientByAccessToken")
        .mockResolvedValue(getMockOAuthClient(oAuthClientPermissions));

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it("should return true for empty Permissions decorator", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(reflector, "get").mockReturnValue([]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      jest
        .spyOn(guard, "getOAuthClientByAccessToken")
        .mockResolvedValue(getMockOAuthClient(oAuthClientPermissions));
      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it("should return false for invalid permissions", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= APPS_WRITE;
      jest
        .spyOn(guard, "getOAuthClientByAccessToken")
        .mockResolvedValue(getMockOAuthClient(oAuthClientPermissions));
      jest.spyOn(guard, "getDecodedThirdPartyAccessToken").mockReturnValue(null);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        "PermissionsGuard - oAuth client with id=100 does not have the required permissions=SCHEDULE_WRITE"
      );
    });

    it("should return false for a missing permission", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE, SCHEDULE_READ]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      jest
        .spyOn(guard, "getOAuthClientByAccessToken")
        .mockResolvedValue(getMockOAuthClient(oAuthClientPermissions));
      jest.spyOn(guard, "getDecodedThirdPartyAccessToken").mockReturnValue(null);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        "PermissionsGuard - oAuth client with id=100 does not have the required permissions=SCHEDULE_WRITE, SCHEDULE_READ"
      );
    });

    it("should return true for 3rd party access token", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(guard, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: ["scope"],
        token_type: "Bearer",
      });

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });
  });

  describe("when OAuth id is provided", () => {
    it("should return true for valid permissions", async () => {
      const mockContext = createMockExecutionContext({ "x-cal-client-id": "100" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      jest.spyOn(guard, "getOAuthClientById").mockResolvedValue(getMockOAuthClient(oAuthClientPermissions));
      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it("should return true for multiple valid permissions", async () => {
      const mockContext = createMockExecutionContext({ "x-cal-client-id": "100" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE, SCHEDULE_READ]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      oAuthClientPermissions |= SCHEDULE_READ;
      jest.spyOn(guard, "getOAuthClientById").mockResolvedValue(getMockOAuthClient(oAuthClientPermissions));

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it("should return true for empty Permissions decorator", async () => {
      const mockContext = createMockExecutionContext({ "x-cal-client-id": "100" });
      jest.spyOn(reflector, "get").mockReturnValue([]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      jest.spyOn(guard, "getOAuthClientById").mockResolvedValue(getMockOAuthClient(oAuthClientPermissions));
      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it("should return false for invalid permissions", async () => {
      const mockContext = createMockExecutionContext({ "x-cal-client-id": "100" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= APPS_WRITE;
      jest.spyOn(guard, "getOAuthClientById").mockResolvedValue(getMockOAuthClient(oAuthClientPermissions));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        "PermissionsGuard - oAuth client with id=100 does not have the required permissions=SCHEDULE_WRITE"
      );
    });

    it("should return false for a missing permission", async () => {
      const mockContext = createMockExecutionContext({ "x-cal-client-id": "100" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE, SCHEDULE_READ]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      jest.spyOn(guard, "getOAuthClientById").mockResolvedValue(getMockOAuthClient(oAuthClientPermissions));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        "PermissionsGuard - oAuth client with id=100 does not have the required permissions=SCHEDULE_WRITE, SCHEDULE_READ"
      );
    });
  });

  function createMockExecutionContext(headers: Record<string, string>): ExecutionContext {
    return createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          get: (headerName: string) => headers[headerName],
        }),
      }),
    });
  }
});
