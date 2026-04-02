import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import { beforeEach, describe, expect, it } from "vitest";
import { usernameCheckForSignup } from "./username";

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
    });
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
