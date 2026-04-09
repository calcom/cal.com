import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCheckPermission }: { mockCheckPermission: Mock } = vi.hoisted(() => ({
  mockCheckPermission: vi.fn(),
}));

vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: vi.fn().mockImplementation(function (this: unknown) {
    return {
      checkPermission: mockCheckPermission,
    };
  }),
}));

vi.mock("@calcom/features/attributes/lib/getAttributes", () => ({
  getAttributesForTeam: vi.fn().mockResolvedValue([{ id: "attr-1" }]),
}));

import { getAttributesForTeam } from "@calcom/features/attributes/lib/getAttributes";
import getAttributesForTeamHandler from "./getAttributesForTeam.handler";

describe("getAttributesForTeamHandler", () => {
  const user = { id: 1 } as unknown as NonNullable<TrpcSessionUser>;
  const teamId = 42;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN and does not load attributes when both permission checks fail", async () => {
    mockCheckPermission.mockResolvedValue(false);

    await expect(
      getAttributesForTeamHandler({
        ctx: { user },
        input: { teamId },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(getAttributesForTeam).not.toHaveBeenCalled();
    expect(mockCheckPermission).toHaveBeenCalledTimes(2);
  });

  it("invokes checkPermission for routingForm.read and eventType.read with team context and fallback roles", async () => {
    mockCheckPermission.mockImplementation(async ({ permission }) => {
      return permission === "routingForm.read";
    });

    await getAttributesForTeamHandler({
      ctx: { user },
      input: { teamId },
    });

    expect(mockCheckPermission).toHaveBeenCalledWith({
      userId: user.id,
      teamId,
      permission: "routingForm.read",
      fallbackRoles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
    });
    expect(mockCheckPermission).toHaveBeenCalledWith({
      userId: user.id,
      teamId,
      permission: "eventType.read",
      fallbackRoles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
    });
  });

  it("returns getAttributesForTeam when routingForm.read is granted", async () => {
    mockCheckPermission.mockImplementation(async ({ permission }) => permission === "routingForm.read");

    const result = await getAttributesForTeamHandler({
      ctx: { user },
      input: { teamId },
    });

    expect(result).toEqual([{ id: "attr-1" }]);
    expect(getAttributesForTeam).toHaveBeenCalledWith({ teamId });
  });

  it("returns getAttributesForTeam when only eventType.read is granted", async () => {
    mockCheckPermission.mockImplementation(async ({ permission }) => permission === "eventType.read");

    await getAttributesForTeamHandler({
      ctx: { user },
      input: { teamId },
    });

    expect(getAttributesForTeam).toHaveBeenCalledWith({ teamId });
  });
});
