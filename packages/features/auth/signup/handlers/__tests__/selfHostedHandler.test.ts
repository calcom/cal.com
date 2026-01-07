import type { Mock } from "vitest";
import { vi } from "vitest";

// Hoisted imports for proper mock initialization
const {
  prismaMock,
  resetPrismaMock,
  createPrismaMock,
} = (await vi.hoisted(
  async () => await import("./mocks/prisma.mocks")
)) as Awaited<typeof import("./mocks/prisma.mocks")>;

const { createNextServerMock } = (await vi.hoisted(
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

vi.mock("next/server", createNextServerMock);
vi.mock("@calcom/prisma", createPrismaMock);
vi.mock("@calcom/prisma/client", createPrismaMock);
vi.mock("@calcom/lib/logger", () => ({
  default: { getSubLogger: () => ({ warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() }) },
}));
vi.mock("@calcom/lib/auth/hashPassword", () => ({ hashPassword: vi.fn().mockResolvedValue("hashed") }));
vi.mock("@calcom/lib/slugify", () => ({ default: vi.fn((s: string) => s.toLowerCase()) }));
vi.mock("@calcom/lib/constants", () => ({ IS_PREMIUM_USERNAME_ENABLED: false }));
vi.mock("@calcom/lib/server/username", () => ({ isUsernameReservedDueToMigration: vi.fn().mockResolvedValue(false) }));
vi.mock("@calcom/features/auth/lib/verifyEmail", () => ({ sendEmailVerification: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/createOrUpdateMemberships", () => ({ createOrUpdateMemberships: vi.fn() }));
vi.mock("@calcom/features/auth/signup/utils/validateUsername", () => ({
  validateAndGetCorrectedUsernameAndEmail: vi.fn().mockResolvedValue({ isValid: true, username: "testuser" }),
}));
vi.mock("../../utils/organization", () => ({ joinAnyChildTeamOnOrgInvite: vi.fn() }));
vi.mock("../../utils/prefillAvatar", () => ({ prefillAvatar: vi.fn() }));
vi.mock("../../utils/token", () => ({
  findTokenByToken: (...args: unknown[]) => mockFindTokenByToken(...args),
  throwIfTokenExpired: vi.fn(),
  validateAndGetCorrectedUsernameForTeam: (...args: unknown[]) => mockValidateAndGetCorrectedUsernameForTeam(...args),
}));

// Import after mocks
import handler from "../selfHostedHandler";
import { runP2002TestSuite } from "./p2002.test-suite";

function callHandler(body: Record<string, string | undefined>): ReturnType<typeof handler> {
  return handler(body as Record<string, string>);
}

runP2002TestSuite("selfHostedHandler", callHandler, () => {
  vi.clearAllMocks();
  resetPrismaMock();
  mockFindTokenByToken.mockResolvedValue(createMockFoundToken());
  mockValidateAndGetCorrectedUsernameForTeam.mockResolvedValue("testuser");
  prismaMock.team.findUnique.mockResolvedValue(createMockTeam() as never);
  prismaMock.verificationToken.delete.mockResolvedValue({} as never);
});
