import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindSoftDeletedOlderThan = vi.fn();
const mockDeleteById = vi.fn();
const mockLogInfo = vi.fn();
const mockLogError = vi.fn();

class MockTeamRepository {
  findSoftDeletedOlderThan = mockFindSoftDeletedOlderThan;
  deleteById = mockDeleteById;
}

vi.mock("@calcom/features/ee/teams/repositories/TeamRepository", () => ({
  TeamRepository: MockTeamRepository,
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

class MockTriggerDevLogger {
  getSubLogger() {
    return {
      info: mockLogInfo,
      error: mockLogError,
    };
  }
}

vi.mock("@calcom/lib/triggerDevLogger", () => ({
  TriggerDevLogger: MockTriggerDevLogger,
}));

describe("runHardDeleteSoftDeletedTeams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return success with 0 deleted count when no teams found", async () => {
    mockFindSoftDeletedOlderThan.mockResolvedValue([]);

    const { runHardDeleteSoftDeletedTeams } = await import("./hardDeleteSoftDeletedTeams");

    const result = await runHardDeleteSoftDeletedTeams();

    expect(mockFindSoftDeletedOlderThan).toHaveBeenCalledWith({ days: 0 });
    expect(mockDeleteById).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "success",
      deletedCount: 0,
    });
  });

  it("should hard delete teams that are soft-deleted", async () => {
    const mockTeams = [
      { id: 1, name: "Team 1", slug: "team-1", isOrganization: false, deletedAt: new Date() },
      { id: 2, name: "Team 2", slug: "team-2", isOrganization: false, deletedAt: new Date() },
    ];
    mockFindSoftDeletedOlderThan.mockResolvedValue(mockTeams);
    mockDeleteById.mockResolvedValue({});

    const { runHardDeleteSoftDeletedTeams } = await import("./hardDeleteSoftDeletedTeams");

    const result = await runHardDeleteSoftDeletedTeams();

    expect(mockFindSoftDeletedOlderThan).toHaveBeenCalledWith({ days: 0 });
    expect(mockDeleteById).toHaveBeenCalledTimes(2);
    expect(mockDeleteById).toHaveBeenCalledWith({ id: 1 });
    expect(mockDeleteById).toHaveBeenCalledWith({ id: 2 });
    expect(result).toEqual({
      status: "success",
      totalFound: 2,
      deletedCount: 2,
      failedCount: 0,
      failedTeamIds: [],
    });
  });

  it("should handle partial failures when some teams fail to delete", async () => {
    const mockTeams = [
      { id: 1, name: "Team 1", slug: "team-1", isOrganization: false, deletedAt: new Date() },
      { id: 2, name: "Team 2", slug: "team-2", isOrganization: false, deletedAt: new Date() },
      { id: 3, name: "Team 3", slug: "team-3", isOrganization: false, deletedAt: new Date() },
    ];
    mockFindSoftDeletedOlderThan.mockResolvedValue(mockTeams);
    mockDeleteById
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("Database error"))
      .mockResolvedValueOnce({});

    const { runHardDeleteSoftDeletedTeams } = await import("./hardDeleteSoftDeletedTeams");

    const result = await runHardDeleteSoftDeletedTeams();

    expect(mockFindSoftDeletedOlderThan).toHaveBeenCalledWith({ days: 0 });
    expect(mockDeleteById).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      status: "partial_failure",
      totalFound: 3,
      deletedCount: 2,
      failedCount: 1,
      failedTeamIds: [2],
    });
  });

  it("should handle all failures gracefully", async () => {
    const mockTeams = [
      { id: 1, name: "Team 1", slug: "team-1", isOrganization: false, deletedAt: new Date() },
      { id: 2, name: "Team 2", slug: "team-2", isOrganization: false, deletedAt: new Date() },
    ];
    mockFindSoftDeletedOlderThan.mockResolvedValue(mockTeams);
    mockDeleteById.mockRejectedValue(new Error("Database error"));

    const { runHardDeleteSoftDeletedTeams } = await import("./hardDeleteSoftDeletedTeams");

    const result = await runHardDeleteSoftDeletedTeams();

    expect(mockFindSoftDeletedOlderThan).toHaveBeenCalledWith({ days: 0 });
    expect(mockDeleteById).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      status: "partial_failure",
      totalFound: 2,
      deletedCount: 0,
      failedCount: 2,
      failedTeamIds: [1, 2],
    });
  });
});

describe("SOFT_DELETE_RETENTION_DAYS", () => {
  it("should be set to 0 for immediate deletion", async () => {
    const { SOFT_DELETE_RETENTION_DAYS } = await import("./hardDeleteSoftDeletedTeams");
    expect(SOFT_DELETE_RETENTION_DAYS).toBe(0);
  });
});
