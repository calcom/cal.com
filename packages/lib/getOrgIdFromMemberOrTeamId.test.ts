import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    team: { findFirst: vi.fn() },
  },
}));

import { prisma } from "@calcom/prisma";
import getOrgIdFromMemberOrTeamId, {
  getPublishedOrgIdFromMemberOrTeamId,
} from "./getOrgIdFromMemberOrTeamId";

describe("getOrgIdFromMemberOrTeamId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns org ID when found by memberId", async () => {
    vi.mocked(prisma.team.findFirst).mockResolvedValueOnce({ id: 100 } as never);

    const result = await getOrgIdFromMemberOrTeamId({ memberId: 1 });

    expect(result).toBe(100);
    expect(prisma.team.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              AND: expect.arrayContaining([
                expect.objectContaining({
                  members: { some: { userId: 1, accepted: true } },
                }),
              ]),
            }),
          ]),
        }),
        select: { id: true },
      })
    );
  });

  it("returns org ID when found by teamId", async () => {
    vi.mocked(prisma.team.findFirst).mockResolvedValueOnce({ id: 200 } as never);

    const result = await getOrgIdFromMemberOrTeamId({ teamId: 50 });

    expect(result).toBe(200);
    expect(prisma.team.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              AND: expect.arrayContaining([
                expect.objectContaining({
                  children: { some: { id: 50 } },
                }),
              ]),
            }),
          ]),
        }),
      })
    );
  });

  it("returns undefined when no org found", async () => {
    vi.mocked(prisma.team.findFirst).mockResolvedValueOnce(null);

    const result = await getOrgIdFromMemberOrTeamId({ memberId: 999 });

    expect(result).toBeUndefined();
  });

  it("uses transaction client when provided", async () => {
    const txFindFirst = vi.fn().mockResolvedValueOnce({ id: 300 });
    const tx = { team: { findFirst: txFindFirst } };

    const result = await getOrgIdFromMemberOrTeamId(
      { memberId: 1 },
      tx as unknown as Parameters<typeof getOrgIdFromMemberOrTeamId>[1]
    );

    expect(result).toBe(300);
    expect(txFindFirst).toHaveBeenCalled();
    expect(prisma.team.findFirst).not.toHaveBeenCalled();
  });

  it("uses default prisma client when no transaction", async () => {
    vi.mocked(prisma.team.findFirst).mockResolvedValueOnce({ id: 400 } as never);

    await getOrgIdFromMemberOrTeamId({ memberId: 1 });

    expect(prisma.team.findFirst).toHaveBeenCalled();
  });
});

describe("getPublishedOrgIdFromMemberOrTeamId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns org ID for published org (slug not null)", async () => {
    vi.mocked(prisma.team.findFirst).mockResolvedValueOnce({ id: 500 } as never);

    const result = await getPublishedOrgIdFromMemberOrTeamId({ memberId: 1 });

    expect(result).toBe(500);
    expect(prisma.team.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: { not: null },
        }),
      })
    );
  });

  it("returns undefined when org exists but is not published", async () => {
    vi.mocked(prisma.team.findFirst).mockResolvedValueOnce(null);

    const result = await getPublishedOrgIdFromMemberOrTeamId({ teamId: 50 });

    expect(result).toBeUndefined();
  });

  it("builds correct where clause for memberId", async () => {
    vi.mocked(prisma.team.findFirst).mockResolvedValueOnce({ id: 600 } as never);

    await getPublishedOrgIdFromMemberOrTeamId({ memberId: 10 });

    expect(prisma.team.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              AND: expect.arrayContaining([expect.objectContaining({ isOrganization: true })]),
            }),
          ]),
        }),
      })
    );
  });

  it("builds correct where clause for teamId", async () => {
    vi.mocked(prisma.team.findFirst).mockResolvedValueOnce({ id: 700 } as never);

    await getPublishedOrgIdFromMemberOrTeamId({ teamId: 20 });

    expect(prisma.team.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              AND: expect.arrayContaining([
                expect.objectContaining({
                  children: { some: { id: 20 } },
                }),
              ]),
            }),
          ]),
        }),
      })
    );
  });
});
