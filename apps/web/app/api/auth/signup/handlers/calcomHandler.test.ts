import type { Mock } from "vitest";
import { vi } from "vitest";

import type { MockResponse } from "./mocks/next.mocks";

// Hoisted imports for proper mock initialization
const {
  prismaMock,
  resetPrismaMock,
  createPrismaMock,
} = (await vi.hoisted(
  async () => await import("./mocks/prisma.mocks")
)) as Awaited<typeof import("./mocks/prisma.mocks")>;

const {
  createNextServerMock,
  createNextHeadersMock,
} = (await vi.hoisted(
  async () => await import("./mocks/next.mocks")
)) as Awaited<typeof import("./mocks/next.mocks")>;

const {
  createMockTeam,
  createMockFoundToken,
} = (await vi.hoisted(
  async () => await import("./mocks/signup.factories")
)) as Awaited<typeof import("./mocks/signup.factories")>;

const mockFindTokenByToken: Mock = vi.fn();
const mockValidateAndGetCorrectedUsernameForTeam: Mock = vi.fn();

type UsernameStatus = {
  statusCode: 200 | 402 | 418;
  requestedUserName: string;
  json: { available: boolean; premium: boolean };
};

type InnerHandler = (body: Record<string, string>, status: UsernameStatus) => Promise<MockResponse>;

let capturedHandler: InnerHandler | null = null;

vi.mock("next/server", createNextServerMock);
vi.mock("next/headers", createNextHeadersMock);
vi.mock("@calcom/prisma", createPrismaMock);
vi.mock("@calcom/prisma/client", createPrismaMock);
vi.mock("@calcom/lib/logger", () => ({
  default: { getSubLogger: () => ({ warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() }) },
}));
vi.mock("@calcom/lib/auth/hashPassword", () => ({ hashPassword: vi.fn().mockResolvedValue("hashed") }));
vi.mock("@calcom/lib/constants", () => ({ WEBAPP_URL: "http://localhost:3000" }));
vi.mock("@calcom/lib/tracking", () => ({ getTrackingFromCookies: vi.fn().mockReturnValue({}) }));
vi.mock("@calcom/app-store/stripepayment/lib/utils", () => ({ getPremiumMonthlyPlanPriceId: vi.fn() }));
vi.mock("@calcom/features/auth/lib/getLocaleFromRequest", () => ({ getLocaleFromRequest: vi.fn().mockResolvedValue("en") }));
vi.mock("@calcom/features/auth/lib/verifyEmail", () => ({ sendEmailVerification: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/createOrUpdateMemberships", () => ({ createOrUpdateMemberships: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/prefillAvatar", () => ({ prefillAvatar: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/validateUsername", () => ({
  validateAndGetCorrectedUsernameAndEmail: vi.fn().mockResolvedValue({ isValid: true, username: "testuser" }),
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
vi.mock("@calcom/web/lib/buildLegacyCtx", () => ({ buildLegacyRequest: vi.fn() }));
vi.mock("../../utils/organization", () => ({ joinAnyChildTeamOnOrgInvite: vi.fn() }));
vi.mock("../../utils/token", () => ({
  findTokenByToken: (...args: unknown[]) => mockFindTokenByToken(...args),
  throwIfTokenExpired: vi.fn(),
  validateAndGetCorrectedUsernameForTeam: (...args: unknown[]) => mockValidateAndGetCorrectedUsernameForTeam(...args),
}));

// Capture inner handler from usernameHandler wrapper
vi.mock("@calcom/lib/server/username", () => ({
  usernameHandler: (handler: InnerHandler) => {
    capturedHandler = handler;
    return handler;
  },
}));

// Import after mocks
await import("../calcomHandler");
import { runP2002TestSuite } from "./p2002.test-suite";

function callHandler(body: Record<string, string | undefined>): Promise<MockResponse> {
  if (!capturedHandler) throw new Error("Handler not captured");
  return capturedHandler(body as Record<string, string>, {
    statusCode: 200,
    requestedUserName: body.username || "testuser",
    json: { available: true, premium: false },
  });
}

runP2002TestSuite("calcomHandler", callHandler, () => {
  vi.clearAllMocks();
  resetPrismaMock();
  mockFindTokenByToken.mockResolvedValue(createMockFoundToken());
  mockValidateAndGetCorrectedUsernameForTeam.mockResolvedValue("testuser");
  prismaMock.team.findUnique.mockResolvedValue(createMockTeam() as never);
  prismaMock.verificationToken.delete.mockResolvedValue({} as never);
});
