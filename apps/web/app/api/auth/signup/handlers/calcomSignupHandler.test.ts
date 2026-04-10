import type { MockResponse } from "@calcom/features/auth/signup/handlers/__tests__/mocks/next.mocks";
import {
  prismaMock,
  resetPrismaMock,
} from "@calcom/features/auth/signup/handlers/__tests__/mocks/prisma.mocks";
import type { SignupBody } from "@calcom/features/auth/signup/handlers/__tests__/mocks/signup.factories";
import {
  createMockFoundToken,
  createMockTeam,
} from "@calcom/features/auth/signup/handlers/__tests__/mocks/signup.factories";
import type { Mock } from "vitest";
import { vi } from "vitest";

const mockFindTokenByToken: Mock = vi.fn();
const mockValidateAndGetCorrectedUsernameForTeam: Mock = vi.fn();
const mockValidateAvailability: Mock = vi.fn();

vi.mock("next/server", async () => {
  const { createNextServerMock } = await import(
    "@calcom/features/auth/signup/handlers/__tests__/mocks/next.mocks"
  );
  return createNextServerMock();
});
vi.mock("next/headers", async () => {
  const { createNextHeadersMock } = await import(
    "@calcom/features/auth/signup/handlers/__tests__/mocks/next.mocks"
  );
  return createNextHeadersMock();
});
vi.mock("@calcom/prisma", async () => {
  const { createPrismaMock } = await import(
    "@calcom/features/auth/signup/handlers/__tests__/mocks/prisma.mocks"
  );
  return createPrismaMock();
});
vi.mock("@calcom/prisma/client", async () => {
  const { createPrismaMock } = await import(
    "@calcom/features/auth/signup/handlers/__tests__/mocks/prisma.mocks"
  );
  return createPrismaMock();
});
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({ warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() }),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));
vi.mock("@calcom/lib/auth/hashPassword", () => ({ hashPassword: vi.fn().mockResolvedValue("hashed") }));
vi.mock("@calcom/lib/constants", () => ({ WEBAPP_URL: "http://localhost:3000" }));
vi.mock("@calcom/lib/tracking", () => ({ getTrackingFromCookies: vi.fn().mockReturnValue({}) }));
vi.mock("@calcom/app-store/stripepayment/lib/utils", () => ({ getPremiumMonthlyPlanPriceId: vi.fn() }));
vi.mock("@calcom/features/auth/lib/getLocaleFromRequest", () => ({
  getLocaleFromRequest: vi.fn().mockResolvedValue("en"),
}));
vi.mock("@calcom/features/auth/lib/verifyEmail", () => ({ sendEmailVerification: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/createOrUpdateMemberships", () => ({
  createOrUpdateMemberships: vi.fn(),
}));
vi.mock("@calcom/features/auth/signup/utils/prefillAvatar", () => ({ prefillAvatar: vi.fn() }));
vi.mock("@calcom/features/users/di/UsernameValidationService.container", () => ({
  getUsernameValidationService: vi.fn().mockReturnValue({
    validateAvailability: (...args: unknown[]) => mockValidateAvailability(...args),
  }),
}));
vi.mock("@calcom/features/ee/billing/di/containers/Billing", () => ({
  getBillingProviderService: vi.fn().mockReturnValue({
    createCustomer: vi.fn().mockResolvedValue({ stripeCustomerId: "cus_123" }),
  }),
}));
vi.mock("@calcom/features/watchlist/lib/telemetry", () => ({ sentrySpan: {} }));
vi.mock("@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller", () => ({
  checkIfEmailIsBlockedInWatchlistController: vi.fn().mockResolvedValue(false),
}));
vi.mock("@calcom/features/di/containers/FeatureRepository", () => ({
  getFeatureRepository: vi.fn().mockReturnValue({
    checkIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(false),
  }),
}));
vi.mock("@calcom/features/watchlist/lib/repository/GlobalWatchlistRepository", () => {
  return {
    GlobalWatchlistRepository: class {
      findBlockedEmail = vi.fn().mockResolvedValue(null);
      createEntry = vi.fn().mockResolvedValue({});
    },
  };
});
vi.mock("@calcom/features/watchlist/lib/utils/normalization", () => ({
  normalizeEmail: vi.fn((e: string) => e.toLowerCase()),
}));
vi.mock("@calcom/web/lib/buildLegacyCtx", () => ({ buildLegacyRequest: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/organization", () => ({ joinAnyChildTeamOnOrgInvite: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/token", () => ({
  findTokenByToken: (...args: unknown[]) => mockFindTokenByToken(...args),
  throwIfTokenExpired: vi.fn(),
  validateAndGetCorrectedUsernameForTeam: (...args: unknown[]) =>
    mockValidateAndGetCorrectedUsernameForTeam(...args),
}));

import { SIGNUP_ERROR_CODES } from "@calcom/features/auth/signup/constants";
import { runEmailAlreadyExistsTestSuite } from "@calcom/features/auth/signup/handlers/__tests__/email-already-exists.test-suite";
import { runP2002TestSuite } from "@calcom/features/auth/signup/handlers/__tests__/p2002.test-suite";
import { createSignupBody } from "@calcom/features/auth/signup/handlers/__tests__/mocks/signup.factories";
import { beforeEach, describe, expect, it } from "vitest";
// Import after mocks
import calcomSignupHandler from "./calcomSignupHandler";

function callHandler(body: SignupBody): Promise<MockResponse> {
  return calcomSignupHandler(body as unknown as Record<string, string>) as unknown as Promise<MockResponse>;
}

const setupMocks = () => {
  vi.clearAllMocks();
  resetPrismaMock();
  mockValidateAvailability.mockResolvedValue({ available: true, premium: false });
  mockFindTokenByToken.mockResolvedValue(createMockFoundToken());
  mockValidateAndGetCorrectedUsernameForTeam.mockResolvedValue("testuser");
  prismaMock.team.findUnique.mockResolvedValue(createMockTeam() as never);
  prismaMock.verificationToken.delete.mockResolvedValue({} as never);
};

runP2002TestSuite("calcomHandler", callHandler, setupMocks);

runEmailAlreadyExistsTestSuite("calcomHandler", callHandler, setupMocks, () => {
  // Mock a fully registered user (has password) to trigger emailRegistered check
  prismaMock.user.findUnique.mockResolvedValue({ password: { hash: "hashed" } } as never);
});

describe("calcomHandler – duplicate email detection for OAuth/SSO users", () => {
  beforeEach(setupMocks);

  it("returns 409 when user exists with verified email but no password (OAuth/SSO signup)", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      emailVerified: new Date("2024-01-01"),
      username: null,
      password: null,
    } as never);

    const response = await callHandler(createSignupBody());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS,
    });
  });

  it("returns 409 when user exists with username but no password or verified email", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      emailVerified: null,
      username: "existinguser",
      password: null,
    } as never);

    const response = await callHandler(createSignupBody());

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: SIGNUP_ERROR_CODES.USER_ALREADY_EXISTS,
    });
  });

  it("does not block signup when user record has no password, no verified email, and no username", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      emailVerified: null,
      username: null,
      password: null,
    } as never);
    // Mock user creation so the handler can proceed past the duplicate check
    prismaMock.user.create.mockResolvedValue({ id: 1 } as never);

    const response = await callHandler(createSignupBody());

    // Should proceed past the duplicate check (not 409)
    expect(response.status).not.toBe(409);
  });

  it("allows invited org member with username to complete signup via token", async () => {
    // Simulate an invited org member: user record pre-created with username but no password/emailVerified
    prismaMock.user.findUnique.mockResolvedValue({
      emailVerified: null,
      username: "invited-user",
      password: null,
      invitedTo: 1,
    } as never);

    // Mock team and user creation for the token-based invite flow
    prismaMock.team.findUnique.mockResolvedValue(createMockTeam() as never);
    prismaMock.user.upsert.mockResolvedValue({ id: 1 } as never);
    prismaMock.verificationToken.delete.mockResolvedValue({} as never);

    const response = await callHandler(createSignupBody({ token: "valid-invite-token" }));

    // Should NOT return 409 — invited users with a token must be allowed through
    expect(response.status).not.toBe(409);
  });
});
