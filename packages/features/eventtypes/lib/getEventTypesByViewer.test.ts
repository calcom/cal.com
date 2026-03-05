import { MembershipRole } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import { compareMembership } from "./getEventTypesByViewer";

describe("compareMembership", () => {
  it("OWNER > ADMIN", () => {
    expect(compareMembership(MembershipRole.OWNER, MembershipRole.ADMIN)).toBe(true);
  });

  it("OWNER > MEMBER", () => {
    expect(compareMembership(MembershipRole.OWNER, MembershipRole.MEMBER)).toBe(true);
  });

  it("ADMIN > MEMBER", () => {
    expect(compareMembership(MembershipRole.ADMIN, MembershipRole.MEMBER)).toBe(true);
  });

  it("MEMBER < ADMIN", () => {
    expect(compareMembership(MembershipRole.MEMBER, MembershipRole.ADMIN)).toBe(false);
  });

  it("MEMBER < OWNER", () => {
    expect(compareMembership(MembershipRole.MEMBER, MembershipRole.OWNER)).toBe(false);
  });

  it("same role (ADMIN = ADMIN) returns false", () => {
    expect(compareMembership(MembershipRole.ADMIN, MembershipRole.ADMIN)).toBe(false);
  });
});
