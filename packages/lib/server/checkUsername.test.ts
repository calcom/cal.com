import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

import { runWithTenants } from "@calcom/prisma/store/prismaStore";

vi.mock("@calcom/prisma/store/prismaStore", () => ({
  runWithTenants: vi.fn(),
}));
vi.mock("./checkRegularUsername", () => ({
  checkRegularUsername: vi.fn(),
}));
vi.mock("./username", () => ({
  usernameCheck: vi.fn(),
}));

type UsernameCheckResult = {
  available: boolean;
  premium: boolean;
  suggestedUsername?: string;
};

describe("checkUsernameMultiTenant", () => {
  let checkUsernameMultiTenant: (
    username: string,
    currentOrgDomain?: string | null
  ) => Promise<UsernameCheckResult>;
  const mockRunWithTenants = vi.mocked(runWithTenants);

  beforeAll(async () => {
    ({ checkUsernameMultiTenant } = await import("./checkUsername"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns available true if username is available in both tenants", async () => {
    mockRunWithTenants.mockImplementation(async (_tenant, _fn) => {
      return { available: true, premium: false };
    });
    const result = await checkUsernameMultiTenant("alice");
    expect(result.available).toBe(true);
    expect(result.premium).toBe(false);
  });

  it("returns available false if username is unavailable in one tenant", async () => {
    mockRunWithTenants
      .mockImplementationOnce(async (_tenant, _fn) => {
        return { available: false, premium: false, suggestedUsername: "alice001" };
      })
      .mockImplementationOnce(async (_tenant, _fn) => {
        return { available: true, premium: false };
      });
    const result = await checkUsernameMultiTenant("alice");
    expect(result.available).toBe(false);
    expect(result.suggestedUsername).toBe("alice001");
  });

  it("returns premium true if username is premium in one tenant", async () => {
    mockRunWithTenants
      .mockImplementationOnce(async (_tenant, _fn) => {
        return { available: true, premium: true };
      })
      .mockImplementationOnce(async (_tenant, _fn) => {
        return { available: true, premium: false };
      });
    const result = await checkUsernameMultiTenant("bob");
    expect(result.available).toBe(true);
    expect(result.premium).toBe(true);
  });

  it("suggests a username available in both tenants if unavailable", async () => {
    // First call: unavailable in US, available in EU
    mockRunWithTenants
      .mockImplementationOnce(async (_tenant, _fn) => {
        return { available: false, premium: false };
      })
      .mockImplementationOnce(async (_tenant, _fn) => {
        return { available: true, premium: false };
      });
    // Suggestion loop: first candidate unavailable, second available
    mockRunWithTenants
      .mockImplementationOnce(async (_tenant, _fn) => {
        return { available: false, premium: false };
      })
      .mockImplementationOnce(async (_tenant, _fn) => {
        return { available: false, premium: false };
      });
    mockRunWithTenants
      .mockImplementationOnce(async (_tenant, _fn) => {
        return { available: true, premium: false };
      })
      .mockImplementationOnce(async (_tenant, _fn) => {
        return { available: true, premium: false };
      });
    const result = await checkUsernameMultiTenant("carol");
    expect(result.available).toBe(false);
    expect(result.suggestedUsername).toBe("carol002");
  });
});
