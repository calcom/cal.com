import { describe, expect, it } from "vitest";

import { getUserCredential } from "./getUserCredential";

describe("getUserCredential", () => {
  it("should return null if credentialId and delegationCredentialId are both null", () => {
    const result = getUserCredential({
      credentialId: null,
      delegationCredentialId: null,
      userId: 1,
    });
    expect(result).toBeNull();
  });

  it("should return delegation credential if delegationCredentialId and userId are provided", () => {
    const result = getUserCredential({
      credentialId: null,
      delegationCredentialId: "delegation-123",
      userId: 1,
    });
    expect(result).toEqual({
      type: "delegation",
      userId: 1,
      delegationCredentialId: "delegation-123",
    });
  });

  it("should return regular credential if credentialId is provided", () => {
    const result = getUserCredential({
      credentialId: 1,
      delegationCredentialId: null,
      userId: null,
    });
    expect(result).toEqual({
      type: "credential",
      userId: null,
      credentialId: 1,
    });
  });

  it("should return null if credentialId is negative and delegationCredentialId is null", () => {
    const result = getUserCredential({
      credentialId: -1,
      delegationCredentialId: null,
      userId: null,
    });
    expect(result).toBeNull();
  });
});
