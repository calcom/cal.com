import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import { beforeEach, describe, expect, it } from "vitest";
import { generateUsernameSuggestion, usernameCheckForSignup } from "./username";

describe("usernameCheckForSignup ", async () => {
  beforeEach(() => {
    // @ts-expect-error
    prismaMock.user.findUnique.mockImplementation(() => {
      return null;
    });
    // @ts-expect-error
    prismaMock.user.findMany.mockImplementation(() => {
      return [];
    });
  });

  it("should return available true for an email that doesn't exist", async () => {
    const res = await usernameCheckForSignup({ username: "johnny", email: "johnny@example.com" });
    expect(res).toEqual({
      available: true,
      premium: false,
      suggestedUsername: "",
      emailRegistered: false,
    });
  });

  it("should return available false for an email that exists and a different username is provided", async () => {
    mockUserInDB({
      id: 1,
      email: "john@example.com",
      username: "john",
    });
    const res = await usernameCheckForSignup({ username: "johnny", email: "john@example.com" });
    expect(res).toEqual({
      available: false,
      premium: false,
      suggestedUsername: "johnny001",
      emailRegistered: false,
    });
  });

  it("should return available true for an email that exists but the user is signing up for an organization", async () => {
    const userId = 1;
    mockUserInDB({
      id: userId,
      email: "john@example.com",
      username: "john",
    });
    mockMembership({ userId });
    const res = await usernameCheckForSignup({ username: "john", email: "john@example.com" });
    expect(res).toEqual({
      available: true,
      // An organization can't have premium username
      premium: false,
      suggestedUsername: "",
      emailRegistered: false,
    });
  });
});

describe("generateUsernameSuggestion", () => {
  it("returns username with zero-padded number when base username is taken", async () => {
    const result = await generateUsernameSuggestion(["john"], "john");
    // Should be "john" + a padded number, e.g. "john001" through "john999"
    expect(result).toMatch(/^john\d+$/);
    expect(result).not.toBe("john");
  });

  it("avoids collisions with existing usernames in the list", async () => {
    // Fill up several possible suggestions to force collision avoidance
    const existing = ["alex001", "alex002", "alex003", "alex"];
    const result = await generateUsernameSuggestion(existing, "alex");
    expect(result).toMatch(/^alex\d+$/);
    expect(existing).not.toContain(result);
  });

  it("handles short usernames (length < 2) with wider random range", async () => {
    const result = await generateUsernameSuggestion(["a"], "a");
    // For short usernames, limit is 9999 instead of 999
    expect(result).toMatch(/^a\d+$/);
    expect(result).not.toBe("a");
  });

  it("returns a suggestion even when no collisions exist", async () => {
    const result = await generateUsernameSuggestion([], "newuser");
    expect(result).toMatch(/^newuser\d+$/);
  });
});

function mockUserInDB({ id, email, username }: { id: number; email: string; username: string }) {
  // @ts-expect-error
  prismaMock.user.findUnique.mockImplementation((arg) => {
    if (arg.where.email === email) {
      return {
        id,
        email,
        username,
      };
    }
    return null;
  });
}

function mockMembership({ userId }: { userId: number }) {
  // @ts-expect-error
  prismaMock.membership.findFirst.mockImplementation((arg) => {
    const isOrganizationWhereClause =
      // @ts-expect-error
      arg?.where?.team?.metadata?.path[0] === "isOrganization" && arg?.where?.team?.metadata?.equals === true;
    if (arg?.where?.userId === userId && isOrganizationWhereClause) {
      return {
        userId,
        teamId: 1,
      };
    }
  });
}
