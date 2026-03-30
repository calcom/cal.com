import { describe, it, expect, vi } from "vitest";

vi.mock("./resource-permissions", () => ({
  getSpecificPermissions: vi.fn().mockResolvedValue({
    invite: true,
    changeMemberRole: true,
    remove: true,
    listMembers: true,
    listMembersPrivate: false,
    impersonate: true,
  }),
}));

import { getTeamMemberPermissions } from "./team-member-permissions";
import { MembershipRole } from "@calcom/prisma/enums";

describe("getTeamMemberPermissions", () => {
  it("returns permissions for private team", async () => {
    const result = await getTeamMemberPermissions({
      userId: 1,
      team: {
        id: 10,
        isPrivate: true,
        membership: { role: MembershipRole.ADMIN, accepted: true },
      },
    });
    expect(result).toHaveProperty("canListMembers");
    expect(result).toHaveProperty("canInvite");
    expect(result).toHaveProperty("canRemove");
  });

  it("returns permissions for non-private team", async () => {
    const result = await getTeamMemberPermissions({
      userId: 1,
      team: {
        id: 10,
        isPrivate: false,
        membership: { role: MembershipRole.MEMBER, accepted: true },
      },
    });
    expect(result).toHaveProperty("canListMembers");
  });
});
