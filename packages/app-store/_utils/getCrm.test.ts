import { describe, it, expect, vi, beforeEach } from "vitest";

import type { CredentialPayload } from "@calcom/types/Credential";

vi.mock("../crm.apps.generated", () => ({
  CrmServiceMap: {
    closecom: Promise.resolve({
      default: vi.fn((credential: CredentialPayload) => ({ type: "closecom", credential })),
    }),
    emptydefault: Promise.resolve({
      default: null,
    }),
  },
}));

import { getCrm } from "./getCrm";

const makeCredential = (overrides: Partial<CredentialPayload> = {}): CredentialPayload => ({
  id: 1,
  type: "closecom_crm",
  key: { api_key: "test-key" },
  userId: 1,
  user: { email: "test@example.com" },
  teamId: null,
  appId: "closecom",
  invalid: false,
  delegatedToId: null,
  delegationCredentialId: null,
  encryptedKey: null,
  ...overrides,
});

describe("getCrm", () => {
  it("should return CRM service for valid credential", async () => {
    const credential = makeCredential();
    const result = await getCrm(credential);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("type", "closecom");
  });

  it("should return null when credential is null", async () => {
    const result = await getCrm(null as unknown as CredentialPayload);
    expect(result).toBeNull();
  });

  it("should return null when credential key is null", async () => {
    const credential = makeCredential({ key: null });
    const result = await getCrm(credential);
    expect(result).toBeNull();
  });

  it("should return null for unknown CRM type", async () => {
    const credential = makeCredential({ type: "unknowncrm_crm" });
    const result = await getCrm(credential);
    expect(result).toBeNull();
  });
});
