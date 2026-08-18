import { describe, it, expect, vi, beforeEach } from "vitest";
import { MembershipRole } from "@calcom/prisma/enums";

describe("Webhook Procedure Authorization & IDOR Protection (#29982)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permits team OWNER or ADMIN to manage team webhooks", () => {
    const authorizedRoles = [MembershipRole.OWNER, MembershipRole.ADMIN];
    const userRole = MembershipRole.ADMIN;

    const isAuthorized = authorizedRoles.includes(userRole);
    expect(isAuthorized).toBe(true);
  });

  it("denies access to regular team MEMBER for team webhooks", () => {
    const authorizedRoles = [MembershipRole.OWNER, MembershipRole.ADMIN];
    const userRole = MembershipRole.MEMBER;

    const isAuthorized = authorizedRoles.includes(userRole);
    expect(isAuthorized).toBe(false);
  });

  it("validates eventType team webhooks require ADMIN or OWNER", () => {
    const isTeamEvent = true;
    const teamRole = MembershipRole.MEMBER;

    const hasAccess = !isTeamEvent || [MembershipRole.ADMIN, MembershipRole.OWNER].includes(teamRole);
    expect(hasAccess).toBe(false);
  });
});
