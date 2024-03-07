import { AppModule } from "@/app.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { createMock } from "@golevelup/ts-jest";
import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";

import { APPS_WRITE, SCHEDULE_READ, SCHEDULE_WRITE } from "@calcom/platform-constants";

import { PermissionsGuard } from "./permissions.guard";

describe("PermissionsGuard", () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TokensModule, PrismaModule],
      providers: [PermissionsGuard, Reflector],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  describe("when access token is missing", () => {
    it("should return false", async () => {
      const mockContext = createMockExecutionContext({});
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE]);
      jest.spyOn(guard, "getOAuthClientPermissions").mockResolvedValue(0);

      await expect(guard.canActivate(mockContext)).resolves.toBe(false);
    });
  });

  describe("when access token is provided", () => {
    it("should return true for valid permissions", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      jest.spyOn(guard, "getOAuthClientPermissions").mockResolvedValue(oAuthClientPermissions);
      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it("should return true for multiple valid permissions", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE, SCHEDULE_READ]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      oAuthClientPermissions |= SCHEDULE_READ;
      jest.spyOn(guard, "getOAuthClientPermissions").mockResolvedValue(oAuthClientPermissions);

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it("should return false for invalid permissions", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= APPS_WRITE;
      jest.spyOn(guard, "getOAuthClientPermissions").mockResolvedValue(oAuthClientPermissions);

      await expect(guard.canActivate(mockContext)).resolves.toBe(false);
    });

    it("should return false for a missing permission", async () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(reflector, "get").mockReturnValue([SCHEDULE_WRITE, SCHEDULE_READ]);

      let oAuthClientPermissions = 0;
      oAuthClientPermissions |= SCHEDULE_WRITE;
      jest.spyOn(guard, "getOAuthClientPermissions").mockResolvedValue(oAuthClientPermissions);

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
