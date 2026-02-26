import { describe, expect, it } from "vitest";

import {
  buildNonDelegationCredential,
  buildNonDelegationCredentials,
  isDelegationCredential,
  isInMemoryDelegationCredential,
} from "./delegationCredential";

describe("isInMemoryDelegationCredential", () => {
  it("returns true for negative credentialId (-1)", () => {
    expect(isInMemoryDelegationCredential({ credentialId: -1 })).toBe(true);
  });

  it("returns true for any negative credentialId", () => {
    expect(isInMemoryDelegationCredential({ credentialId: -100 })).toBe(true);
    expect(isInMemoryDelegationCredential({ credentialId: -999 })).toBe(true);
  });

  it("returns false for positive credentialId", () => {
    expect(isInMemoryDelegationCredential({ credentialId: 1 })).toBe(false);
    expect(isInMemoryDelegationCredential({ credentialId: 100 })).toBe(false);
  });

  it("returns false for zero", () => {
    expect(isInMemoryDelegationCredential({ credentialId: 0 })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isInMemoryDelegationCredential({ credentialId: null })).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isInMemoryDelegationCredential({ credentialId: undefined })).toBe(false);
  });
});

describe("isDelegationCredential (backward compat alias)", () => {
  it("is the same function as isInMemoryDelegationCredential", () => {
    expect(isDelegationCredential).toBe(isInMemoryDelegationCredential);
  });
});

describe("buildNonDelegationCredential", () => {
  it("adds delegation nulls to a regular credential", () => {
    const cred = { id: 1, type: "google_calendar", key: "abc" };
    const result = buildNonDelegationCredential(cred);

    expect(result).toEqual({
      id: 1,
      type: "google_calendar",
      key: "abc",
      delegatedTo: null,
      delegatedToId: null,
      delegationCredentialId: null,
    });
  });

  it("returns null for null input", () => {
    expect(buildNonDelegationCredential(null)).toBeNull();
  });

  it("returns null for an in-DB delegation credential", () => {
    // id > 0 (not in-memory) and has delegationCredentialId
    const cred = { id: 5, delegationCredentialId: 10, type: "google_calendar" };
    expect(buildNonDelegationCredential(cred)).toBeNull();
  });

  it("keeps credentials without delegationCredentialId", () => {
    const cred = { id: 5, type: "zoom" };
    const result = buildNonDelegationCredential(cred);
    expect(result).not.toBeNull();
    expect(result!.delegatedTo).toBeNull();
  });

  it("keeps in-memory delegation credentials (negative id)", () => {
    // In-memory delegation creds have negative id — isInDbDelegationCredential returns false for them
    const cred = { id: -1, delegationCredentialId: 10, type: "google_calendar" };
    const result = buildNonDelegationCredential(cred);
    expect(result).not.toBeNull();
  });
});

describe("buildNonDelegationCredentials", () => {
  it("filters out in-DB delegation credentials from array", () => {
    const credentials = [
      { id: 1, type: "google_calendar" },
      { id: 5, delegationCredentialId: 10, type: "zoom" }, // in-DB delegation — filtered out
      { id: 3, type: "stripe" },
    ];

    const result = buildNonDelegationCredentials(credentials);

    // The in-DB delegation credential (id:5) should be filtered out
    expect(result).toHaveLength(2);
    expect(result.every((r) => r !== null)).toBe(true);
  });

  it("returns empty array for empty input", () => {
    expect(buildNonDelegationCredentials([])).toEqual([]);
  });

  it("keeps all non-delegation credentials unchanged", () => {
    const credentials = [
      { id: 1, type: "google_calendar" },
      { id: 2, type: "zoom" },
    ];

    const result = buildNonDelegationCredentials(credentials);
    expect(result).toHaveLength(2);
    result.forEach((r) => {
      expect(r).toHaveProperty("delegatedTo", null);
      expect(r).toHaveProperty("delegatedToId", null);
    });
  });
});
