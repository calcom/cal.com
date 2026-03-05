import { describe, it, expect, vi } from "vitest";

import type { CredentialPayload } from "@calcom/types/Credential";

vi.mock("../analytics.services.generated", () => ({
  AnalyticsServiceMap: {
    ga4: Promise.resolve({
      default: vi.fn((credential: CredentialPayload) => ({ type: "ga4", credential })),
    }),
    nodefault: Promise.resolve({
      default: null,
    }),
  },
}));

import { getAnalyticsService } from "./getAnalytics";

const makeCredential = (overrides: Partial<CredentialPayload> = {}): CredentialPayload => ({
  id: 1,
  type: "ga4_analytics",
  key: { tracking_id: "G-XXXX" },
  userId: 1,
  user: { email: "test@example.com" },
  teamId: null,
  appId: "ga4",
  invalid: false,
  delegatedToId: null,
  delegationCredentialId: null,
  encryptedKey: null,
  ...overrides,
});

describe("getAnalyticsService", () => {
  it("should return analytics service for valid credential", async () => {
    const credential = makeCredential();
    const result = await getAnalyticsService({ credential });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("type", "ga4");
  });

  it("should return null when credential key is null", async () => {
    const credential = makeCredential({ key: null });
    const result = await getAnalyticsService({ credential });
    expect(result).toBeNull();
  });

  it("should return null for unknown analytics type", async () => {
    const credential = makeCredential({ type: "unknown_analytics" });
    const result = await getAnalyticsService({ credential });
    expect(result).toBeNull();
  });
});
