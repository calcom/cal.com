import { describe, expect, it } from "vitest";
import { buildCredentialPayloadForPrisma } from "./buildCredentialPayloadForCalendar";

describe("buildCredentialPayloadForPrisma", () => {
  it("returns both credentialId and delegationCredentialId when valid", () => {
    const result = buildCredentialPayloadForPrisma({
      credentialId: 123,
      delegationCredentialId: "delegation-abc",
    });
    expect(result).toEqual({
      credentialId: 123,
      delegationCredentialId: "delegation-abc",
    });
  });

  it("returns null credentialId when credentialId is negative", () => {
    const result = buildCredentialPayloadForPrisma({
      credentialId: -1,
      delegationCredentialId: "delegation-xyz",
    });
    expect(result).toEqual({
      credentialId: null,
      delegationCredentialId: "delegation-xyz",
    });
  });

  it("returns null credentialId for any negative value", () => {
    const result = buildCredentialPayloadForPrisma({
      credentialId: -999,
      delegationCredentialId: null,
    });
    expect(result).toEqual({
      credentialId: null,
      delegationCredentialId: null,
    });
  });

  it("passes through null credentialId unchanged", () => {
    const result = buildCredentialPayloadForPrisma({
      credentialId: null,
      delegationCredentialId: "delegation-abc",
    });
    expect(result).toEqual({
      credentialId: null,
      delegationCredentialId: "delegation-abc",
    });
  });

  it("passes through undefined credentialId unchanged", () => {
    const result = buildCredentialPayloadForPrisma({
      credentialId: undefined,
      delegationCredentialId: "delegation-abc",
    });
    expect(result).toEqual({
      credentialId: undefined,
      delegationCredentialId: "delegation-abc",
    });
  });

  it("handles zero credentialId (should not be treated as negative)", () => {
    const result = buildCredentialPayloadForPrisma({
      credentialId: 0,
      delegationCredentialId: null,
    });
    // 0 is falsy so the condition `credentialId && credentialId < 0` is false
    expect(result).toEqual({
      credentialId: 0,
      delegationCredentialId: null,
    });
  });

  it("handles both null", () => {
    const result = buildCredentialPayloadForPrisma({
      credentialId: null,
      delegationCredentialId: null,
    });
    expect(result).toEqual({
      credentialId: null,
      delegationCredentialId: null,
    });
  });

  it("handles both undefined", () => {
    const result = buildCredentialPayloadForPrisma({
      credentialId: undefined,
      delegationCredentialId: undefined,
    });
    expect(result).toEqual({
      credentialId: undefined,
      delegationCredentialId: undefined,
    });
  });
});
