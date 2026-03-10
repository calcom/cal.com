import { createMock } from "@golevelup/ts-jest";
import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { OAuthPermissionsGuard } from "./oauth-permissions.guard";
import { TokensService } from "@/modules/tokens/tokens.service";

describe("OAuthPermissionsGuard", () => {
  let guard: OAuthPermissionsGuard;
  let reflector: Reflector;
  let tokensService: TokensService;
  let oauthPermissionsDecorator: jest.SpyInstance;
  let getDecodedThirdPartyAccessToken: jest.SpyInstance;

  beforeEach(() => {
    reflector = new Reflector();
    tokensService = createMock<TokensService>();
    guard = new OAuthPermissionsGuard(reflector, tokensService);
    oauthPermissionsDecorator = jest.spyOn(reflector, "get");
    getDecodedThirdPartyAccessToken = jest.spyOn(guard, "getDecodedThirdPartyAccessToken");
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

  describe("when handler has no @OAuthPermissions decorator", () => {
    describe("positive", () => {
      it("should allow legacy token (empty scopes)", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: [],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(undefined);

        expect(guard.canActivate(mockContext)).toBe(true);
      });

      it("should allow legacy token (old scope names only)", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["READ_BOOKING", "READ_PROFILE"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(undefined);

        expect(guard.canActivate(mockContext)).toBe(true);
      });

      it("should allow non-third-party requests", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue(null);

        expect(guard.canActivate(mockContext)).toBe(true);
      });

      it("should allow requests with no bearer token", () => {
        const mockContext = createMockExecutionContext({});

        expect(guard.canActivate(mockContext)).toBe(true);
      });
    });

    describe("negative", () => {
      it("should deny third-party token with new scopes", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["BOOKING_READ"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(undefined);

        expect(() => guard.canActivate(mockContext)).toThrow(
          "insufficient_scope: this endpoint is not available for third-party OAuth tokens"
        );
      });
    });
  });

  describe("personal scope enforcement", () => {
    describe("positive", () => {
      it("should allow token with matching scope", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["BOOKING_READ", "BOOKING_WRITE"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["BOOKING_READ"]);

        expect(guard.canActivate(mockContext)).toBe(true);
      });

      it("should allow when @OAuthPermissions is empty array", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["BOOKING_READ"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue([]);

        expect(guard.canActivate(mockContext)).toBe(true);
      });

      it("should allow when token has all required scopes", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["EVENT_TYPE_READ", "SCHEDULE_WRITE"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["EVENT_TYPE_READ", "SCHEDULE_WRITE"]);

        expect(guard.canActivate(mockContext)).toBe(true);
      });

      it("should allow token with APPS_READ scope", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["APPS_READ"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["APPS_READ"]);

        expect(guard.canActivate(mockContext)).toBe(true);
      });

      it("should allow token with APPS_WRITE scope", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["APPS_WRITE"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["APPS_WRITE"]);

        expect(guard.canActivate(mockContext)).toBe(true);
      });

      it("should allow token with PROFILE_WRITE scope", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["PROFILE_WRITE"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["PROFILE_WRITE"]);

        expect(guard.canActivate(mockContext)).toBe(true);
      });
    });

    describe("negative", () => {
      it("should deny token with insufficient scope", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["BOOKING_READ"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["BOOKING_WRITE"]);

        expect(() => guard.canActivate(mockContext)).toThrow("insufficient_scope");
      });

      it("should deny when token is missing one of multiple required scopes", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["EVENT_TYPE_READ"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["EVENT_TYPE_READ", "SCHEDULE_WRITE"]);

        expect(() => guard.canActivate(mockContext)).toThrow("insufficient_scope");
      });
    });
  });

  describe("team scope enforcement", () => {
    describe("positive", () => {
      it("should allow token with matching TEAM_ scope", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["TEAM_EVENT_TYPE_READ"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["TEAM_EVENT_TYPE_READ"]);

        expect(guard.canActivate(mockContext)).toBe(true);
      });
    });

    describe("negative", () => {
      it("should deny personal scope when team scope is required", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["EVENT_TYPE_READ"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["TEAM_EVENT_TYPE_READ"]);

        expect(() => guard.canActivate(mockContext)).toThrow("insufficient_scope");
      });

      it("should deny team scope when a different team resource is required", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["TEAM_BOOKING_READ"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["TEAM_EVENT_TYPE_READ"]);

        expect(() => guard.canActivate(mockContext)).toThrow("insufficient_scope");
      });
    });
  });

  describe("org scope enforcement", () => {
    describe("positive", () => {
      it("should allow token with matching ORG_BOOKING_READ scope", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["ORG_BOOKING_READ"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["ORG_BOOKING_READ"]);

        expect(guard.canActivate(mockContext)).toBe(true);
      });

      it("should allow token with matching ORG_SCHEDULE_WRITE scope", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["ORG_SCHEDULE_WRITE"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["ORG_SCHEDULE_WRITE"]);

        expect(guard.canActivate(mockContext)).toBe(true);
      });
    });

    describe("negative", () => {
      it("should deny token with wrong ORG_ resource", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["ORG_BOOKING_READ"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["ORG_SCHEDULE_READ"]);

        expect(() => guard.canActivate(mockContext)).toThrow("insufficient_scope");
      });

      it("should deny ORG_ READ scope when ORG_ WRITE is required", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["ORG_PROFILE_READ"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["ORG_PROFILE_WRITE"]);

        expect(() => guard.canActivate(mockContext)).toThrow("insufficient_scope");
      });

      it("should deny personal scope when org scope is required", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["BOOKING_READ"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["ORG_BOOKING_READ"]);

        expect(() => guard.canActivate(mockContext)).toThrow("insufficient_scope");
      });
    });
  });

  describe("ORG → TEAM scope implication", () => {
    describe("positive", () => {
      it("should allow ORG_PROFILE_READ when TEAM_PROFILE_READ is required", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["ORG_PROFILE_READ"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["TEAM_PROFILE_READ"]);

        expect(guard.canActivate(mockContext)).toBe(true);
      });

      it("should allow ORG_PROFILE_WRITE when TEAM_PROFILE_WRITE is required", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["ORG_PROFILE_WRITE"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["TEAM_PROFILE_WRITE"]);

        expect(guard.canActivate(mockContext)).toBe(true);
      });
    });

    describe("negative", () => {
      it("should deny TEAM_ scope when ORG_ scope is required", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["TEAM_PROFILE_READ"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["ORG_PROFILE_READ"]);

        expect(() => guard.canActivate(mockContext)).toThrow("insufficient_scope");
      });

      it("should deny ORG_ scope when resource suffix does not match", () => {
        const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
        getDecodedThirdPartyAccessToken.mockReturnValue({
          scope: ["ORG_SCHEDULE_WRITE"],
          token_type: "Access Token",
        });
        oauthPermissionsDecorator.mockReturnValue(["TEAM_SCHEDULE_READ"]);

        expect(() => guard.canActivate(mockContext)).toThrow("insufficient_scope");
      });
    });
  });

  describe("Legacy OAuth client backward compatibility", () => {
    it("should allow token with empty scopes even when handler requires BOOKING_READ", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      getDecodedThirdPartyAccessToken.mockReturnValue({
        scope: [],
        token_type: "Access Token",
      });
      oauthPermissionsDecorator.mockReturnValue(["BOOKING_READ"]);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it("should allow token with legacy scope names even when handler requires BOOKING_READ", () => {
      const mockContext = createMockExecutionContext({ Authorization: "Bearer token" });
      getDecodedThirdPartyAccessToken.mockReturnValue({
        scope: ["READ_BOOKING", "READ_PROFILE"],
        token_type: "Access Token",
      });
      oauthPermissionsDecorator.mockReturnValue(["BOOKING_READ"]);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

  });
});
