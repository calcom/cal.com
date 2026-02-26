import { describe, expect, it, vi, beforeEach } from "vitest";

const { findUniqueMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    eventType: {
      findUnique: findUniqueMock,
    },
  },
}));

import { getTeamIdFromEventType } from "./getTeamIdFromEventType";

describe("getTeamIdFromEventType", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns team id when eventType has a team", async () => {
    const result = await getTeamIdFromEventType({
      eventType: { team: { id: 42 }, parentId: null },
    });
    expect(result).toBe(42);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("looks up parent event type when parentId is set (managed event)", async () => {
    findUniqueMock.mockResolvedValue({ teamId: 99 });

    const result = await getTeamIdFromEventType({
      eventType: { team: null, parentId: 7 },
    });

    expect(result).toBe(99);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { teamId: true },
    });
  });

  it("returns undefined when parent lookup returns null", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await getTeamIdFromEventType({
      eventType: { team: null, parentId: 7 },
    });

    expect(result).toBeUndefined();
  });

  it("returns undefined when eventType has no team and no parentId", async () => {
    const result = await getTeamIdFromEventType({
      eventType: { team: null, parentId: null },
    });

    expect(result).toBeUndefined();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("prefers team.id over parentId when both exist", async () => {
    const result = await getTeamIdFromEventType({
      eventType: { team: { id: 10 }, parentId: 20 },
    });

    expect(result).toBe(10);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("skips team.id when it is null", async () => {
    findUniqueMock.mockResolvedValue({ teamId: 55 });

    const result = await getTeamIdFromEventType({
      eventType: { team: { id: null }, parentId: 3 },
    });

    expect(result).toBe(55);
  });
});
