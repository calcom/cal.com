import { describe, expect, it, vi } from "vitest";

import handler from "./delete.handler";

vi.mock("@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository", () => ({
  DelegationCredentialRepository: {
    deleteById: vi.fn(),
  },
}));

describe("delete delegation credential", () => {
  it("always rejects with 'Not allowed' because deletion is currently disabled", async () => {
    await expect(
      handler({ input: { id: "any-id" } })
    ).rejects.toThrow("Not allowed");
  });
});
