import type { Session } from "next-auth";
import { describe, expect, it } from "vitest";

import { UserPermissionRole } from "@calcom/prisma/enums";

import {
  parseTeamId,
  checkSelfImpersonation,
  checkUserIdentifier,
  checkPermission,
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
    expect(() => checkPermission(session)).toThrow();
  });

  it("should not throw an error if the user is an admin and team impersonation is disabled", () => {
    const modifiedSession = { ...session, user: { ...session.user, role: UserPermissionRole.ADMIN } };
    process.env.NEXT_PUBLIC_TEAM_IMPERSONATION = "false";
    expect(() => checkPermission(modifiedSession)).not.toThrow();
  });

  it("should not throw an error if the user is not an admin but team impersonation is enabled", () => {
    process.env.NEXT_PUBLIC_TEAM_IMPERSONATION = "true";
    expect(() => checkPermission(session)).not.toThrow();
  });
});
