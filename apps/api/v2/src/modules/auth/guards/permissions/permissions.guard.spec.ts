import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { createMock } from "@golevelup/ts-jest";
import { ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";

import { APPS_WRITE, SCHEDULE_READ, SCHEDULE_WRITE } from "@calcom/platform-constants";

import { PermissionsGuard } from "./permissions.guard";

describe("PermissionsGuard", () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    reflector = new Reflector();
    guard = new PermissionsGuard(
      reflector,
      createMock<TokensRepository>(),
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
      createMock<OAuthClientRepository>()
    );
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  describe("when access token is missing", () => {
    it("should return false", async () => {
      const mockContext = createMockExecutionContext({});
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE]);
      jest.spyOn(guard, "getOAuthClientPermissionsByAccessToken").mockResolvedValue(0);

      await expect(guard.canActivate(mockContext)).resolves.toBe(false);
    });
  });

  describe("when access token is provided", () => {
    it("should return true for valid permissions", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      jest.spyOn(guard, "getOAuthClientPermissionsByAccessToken").mockResolvedValue(oAuthClientPermissions);
      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it("should return true for multiple valid permissions", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE, SCHEDULE_READ]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      oAuthClientPermissions |= SCHEDULE_READ;
      jest.spyOn(guard, "getOAuthClientPermissionsByAccessToken").mockResolvedValue(oAuthClientPermissions);

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it("should return true for empty Permissions decorator", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(reflector, "get").mockReturnValue([]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      jest.spyOn(guard, "getOAuthClientPermissionsByAccessToken").mockResolvedValue(oAuthClientPermissions);
      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it("should return false for invalid permissions", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= APPS_WRITE;
      jest.spyOn(guard, "getOAuthClientPermissionsByAccessToken").mockResolvedValue(oAuthClientPermissions);

      await expect(guard.canActivate(mockContext)).resolves.toBe(false);
    });

    it("should return false for a missing permission", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE, SCHEDULE_READ]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      jest.spyOn(guard, "getOAuthClientPermissionsByAccessToken").mockResolvedValue(oAuthClientPermissions);

      await expect(guard.canActivate(mockContext)).resolves.toBe(false);
    });
  });

  describe("when OAuth id is provided", () => {
    it("should return true for valid permissions", async () => {
      const mockContext = createMockExecutionContext({ "x-cal-client-id": "100" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      jest.spyOn(guard, "getOAuthClientPermissionsById").mockResolvedValue(oAuthClientPermissions);
      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it("should return true for multiple valid permissions", async () => {
      const mockContext = createMockExecutionContext({ "x-cal-client-id": "100" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE, SCHEDULE_READ]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      oAuthClientPermissions |= SCHEDULE_READ;
      jest.spyOn(guard, "getOAuthClientPermissionsById").mockResolvedValue(oAuthClientPermissions);

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it("should return true for empty Permissions decorator", async () => {
      const mockContext = createMockExecutionContext({ "x-cal-client-id": "100" });
      jest.spyOn(reflector, "get").mockReturnValue([]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      jest.spyOn(guard, "getOAuthClientPermissionsById").mockResolvedValue(oAuthClientPermissions);
      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it("should return false for invalid permissions", async () => {
      const mockContext = createMockExecutionContext({ "x-cal-client-id": "100" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= APPS_WRITE;
      jest.spyOn(guard, "getOAuthClientPermissionsById").mockResolvedValue(oAuthClientPermissions);

      await expect(guard.canActivate(mockContext)).resolves.toBe(false);
    });

    it("should return false for a missing permission", async () => {
      const mockContext = createMockExecutionContext({ "x-cal-client-id": "100" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE, SCHEDULE_READ]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      jest.spyOn(guard, "getOAuthClientPermissionsById").mockResolvedValue(oAuthClientPermissions);

      await expect(guard.canActivate(mockContext)).resolves.toBe(false);
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
