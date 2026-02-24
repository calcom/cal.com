import {
  APPS_READ,
  APPS_WRITE,
  BOOKING_READ,
  BOOKING_WRITE,
  EVENT_TYPE_READ,
  PROFILE_WRITE,
  SCHEDULE_WRITE,
} from "@calcom/platform-constants";
import { createMock } from "@golevelup/ts-jest";
import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThirdPartyPermissionsGuard } from "./third-party-permissions.guard";
import { TokensService } from "@/modules/tokens/tokens.service";

describe("ThirdPartyPermissionsGuard", () => {
  let guard: ThirdPartyPermissionsGuard;
  let reflector: Reflector;
  let tokensService: TokensService;

  beforeEach(() => {
    reflector = new Reflector();
    tokensService = createMock<TokensService>();
    guard = new ThirdPartyPermissionsGuard(reflector, tokensService);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
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

  describe("when handler has no @Permissions decorator", () => {
    it("should deny third-party token with new scopes when no @Permissions on handler", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: ["BOOKING_READ"],
        token_type: "Access Token",
      });
      jest.spyOn(reflector, "get").mockReturnValue(undefined);

      expect(() => guard.canActivate(mockContext)).toThrow(
        "insufficient_scope: this endpoint is not available for third-party OAuth tokens"
      );
    });

    it("should allow legacy token (empty scopes) when no @Permissions on handler", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: [],
        token_type: "Access Token",
      });
      jest.spyOn(reflector, "get").mockReturnValue(undefined);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should allow legacy token (old scope names only) when no @Permissions on handler", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: ["READ_BOOKING", "READ_PROFILE"],
        token_type: "Access Token",
      });
      jest.spyOn(reflector, "get").mockReturnValue(undefined);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should allow non-third-party requests when no @Permissions on handler", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue(null);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should allow requests with no bearer token", () => {
      const mockContext = createMockExecutionContext({});

      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });

  describe("scope enforcement via @Permissions", () => {
    it("should allow third-party token with matching scope", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: ["BOOKING_READ", "BOOKING_WRITE"],
        token_type: "Access Token",
      });
      jest.spyOn(reflector, "get").mockReturnValue([BOOKING_READ]);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should deny third-party token with insufficient scope", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: ["BOOKING_READ"],
        token_type: "Access Token",
      });
      jest.spyOn(reflector, "get").mockReturnValue([BOOKING_WRITE]);

      expect(() => guard.canActivate(mockContext)).toThrow("insufficient_scope");
    });

    it("should allow when @Permissions is empty array", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: ["BOOKING_READ"],
        token_type: "Access Token",
      });
      jest.spyOn(reflector, "get").mockReturnValue([]);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should allow when token has all required scopes from multiple permissions", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: ["EVENT_TYPE_READ", "SCHEDULE_WRITE"],
        token_type: "Access Token",
      });
      jest.spyOn(reflector, "get").mockReturnValue([EVENT_TYPE_READ, SCHEDULE_WRITE]);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should deny when token is missing one of multiple required scopes", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: ["EVENT_TYPE_READ"],
        token_type: "Access Token",
      });
      jest.spyOn(reflector, "get").mockReturnValue([EVENT_TYPE_READ, SCHEDULE_WRITE]);

      expect(() => guard.canActivate(mockContext)).toThrow("insufficient_scope");
    });

    it("should allow third-party token with APPS_READ scope", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: ["APPS_READ"],
        token_type: "Access Token",
      });
      jest.spyOn(reflector, "get").mockReturnValue([APPS_READ]);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should allow third-party token with APPS_WRITE scope", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: ["APPS_WRITE"],
        token_type: "Access Token",
      });
      jest.spyOn(reflector, "get").mockReturnValue([APPS_WRITE]);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should allow third-party token with PROFILE_WRITE scope", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: ["PROFILE_WRITE"],
        token_type: "Access Token",
      });
      jest.spyOn(reflector, "get").mockReturnValue([PROFILE_WRITE]);

      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });

  describe("Legacy OAuth client backward compatibility", () => {
    it("should allow token with empty scopes even when handler requires BOOKING_READ", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: [],
        token_type: "Access Token",
      });
      jest.spyOn(reflector, "get").mockReturnValue([BOOKING_READ]);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should allow token with legacy scope names even when handler requires BOOKING_READ", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: ["READ_BOOKING", "READ_PROFILE"],
        token_type: "Access Token",
      });
      jest.spyOn(reflector, "get").mockReturnValue([BOOKING_READ]);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should allow token with no scope field at all (pre-scope tokens)", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      jest.spyOn(tokensService, "getDecodedThirdPartyAccessToken").mockReturnValue({
        scope: undefined,
        token_type: "Access Token",
      });
      jest.spyOn(reflector, "get").mockReturnValue([BOOKING_READ]);

      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });
});
