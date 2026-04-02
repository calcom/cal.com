import process from "node:process";
import { MembershipRole, UserPermissionRole } from "@calcom/prisma/enums";
import type { Session } from "next-auth";
import { describe, expect, it, vi } from "vitest";
import {
  checkGlobalPermission,
  checkPBACImpersonationPermission,
  checkSelfImpersonation,
  checkUserIdentifier,
  parseTeamId,
} from "./ImpersonationProvider";

const session: Session = {
  expires: "2021-08-31T15:00:00.000Z",
  hasValidLicense: true,
  user: {
    id: 123,
    username: "test",
    role: UserPermissionRole.USER,
    email: "test@example.com",
  },
};

vi.mock("@calcom/prisma", () => {
  return {
    prisma: vi.fn(),
  };
});

describe("parseTeamId", () => {
  it("should return undefined if no teamId is provided", () => {
    expect(parseTeamId(undefined)).toBeUndefined();
  });

  it("should return the parsed teamId if a teamId is provided", () => {
    expect(parseTeamId({ username: "test", teamId: "123" })).toBe(123);
  });

  it("should throw an error if the provided teamId is not a positive number", () => {
    expect(() => parseTeamId({ username: "test", teamId: "-123" })).toThrow();
  });
  it("should throw an error if the provided teamId is not a number", () => {
    expect(() => parseTeamId({ username: "test", teamId: "notanumber" })).toThrow();
  });
});

describe("checkSelfImpersonation", () => {
  it("should throw an error if the provided username is the same as the session user's username", () => {
    expect(() => checkSelfImpersonation(session, { username: "test" })).toThrow();
  });

  it("should throw an error if the provided username is the same as the session user's email", () => {
    expect(() => checkSelfImpersonation(session, { username: "test@example.com" })).toThrow();
  });

  it("should not throw an error if the provided username is different from the session user's username and email", () => {
    expect(() => checkSelfImpersonation(session, { username: "other" })).not.toThrow();
  });
});

describe("checkUserIdentifier", () => {
  it("should throw an error if no username is provided", () => {
    expect(() => checkUserIdentifier(undefined)).toThrow();
  });

  it("should not throw an error if a username is provided", () => {
    expect(() => checkUserIdentifier({ username: "test" })).not.toThrow();
  });
});

describe("checkPermission", () => {
  it("should throw an error if the user is not an admin and team impersonation is disabled", () => {
    process.env.NEXT_PUBLIC_TEAM_IMPERSONATION = "false";
    expect(() => checkGlobalPermission(session)).toThrow();
  });

  it("should not throw an error if the user is an admin and team impersonation is disabled", () => {
    const modifiedSession = { ...session, user: { ...session.user, role: UserPermissionRole.ADMIN } };
    process.env.NEXT_PUBLIC_TEAM_IMPERSONATION = "false";
    expect(() => checkGlobalPermission(modifiedSession)).not.toThrow();
  });

  it("should not throw an error if the user is not an admin but team impersonation is enabled", () => {
    process.env.NEXT_PUBLIC_TEAM_IMPERSONATION = "true";
    expect(() => checkGlobalPermission(session)).not.toThrow();
  });
});

describe("checkPBACImpersonationPermission", () => {
  it("should return true for admin users", async () => {
    const result = await checkPBACImpersonationPermission({
      userId: 123,
      teamId: 456,
      userRole: MembershipRole.ADMIN,
    });
    expect(result).toBe(true);
  });

  it("should return true for owner users", async () => {
    const result = await checkPBACImpersonationPermission({
      userId: 123,
      teamId: 456,
      userRole: MembershipRole.OWNER,
    });
    expect(result).toBe(true);
  });

  it("should return false for member users", async () => {
    const result = await checkPBACImpersonationPermission({
      userId: 123,
      teamId: 456,
      userRole: MembershipRole.MEMBER,
    });
    expect(result).toBe(false);
  });

  it("should handle organization context", async () => {
    const result = await checkPBACImpersonationPermission({
      userId: 123,
      organizationId: 789,
      userRole: MembershipRole.ADMIN,
    });
    expect(result).toBe(true);
  });
});
