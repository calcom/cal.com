import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSearchByTeamIdAndEmailPrefix = vi.fn();

vi.mock("@calcom/features/di/containers/MembershipRepository", () => ({
  getMembershipRepository: () => ({
    searchByTeamIdAndEmailPrefix: (...args: unknown[]) => mockSearchByTeamIdAndEmailPrefix(...args),
  }),
}));

import searchUsersByEmailHandler from "./searchUsersByEmail.handler";

const TEAM_ID = 10;

describe("searchUsersByEmailHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns matching team members by email prefix", async () => {
    const mockMemberships = [
      { user: { id: 1, email: "alice@example.com", name: "Alice" } },
      { user: { id: 2, email: "alice2@example.com", name: "Alice Two" } },
    ];
    mockSearchByTeamIdAndEmailPrefix.mockResolvedValue(mockMemberships);

    const result = await searchUsersByEmailHandler({
      input: { teamId: TEAM_ID, query: "ali", cursor: null, limit: 10 },
    });

    expect(result.users).toEqual([
      { id: 1, email: "alice@example.com", name: "Alice" },
      { id: 2, email: "alice2@example.com", name: "Alice Two" },
    ]);
    expect(result.nextCursor).toBeNull();
    expect(mockSearchByTeamIdAndEmailPrefix).toHaveBeenCalledWith({
      teamId: TEAM_ID,
      emailPrefix: "ali",
      cursor: null,
      limit: 10,
    });
  });

  it("sets nextCursor when there are more results than the limit", async () => {
    const mockMemberships = [
      { user: { id: 1, email: "bob1@example.com", name: "Bob One" } },
      { user: { id: 2, email: "bob2@example.com", name: "Bob Two" } },
      { user: { id: 3, email: "bob3@example.com", name: "Bob Three" } },
      { user: { id: 4, email: "bob4@example.com", name: "Bob Four" } },
    ];
    mockSearchByTeamIdAndEmailPrefix.mockResolvedValue(mockMemberships);

    const result = await searchUsersByEmailHandler({
      input: { teamId: TEAM_ID, query: "bob", cursor: null, limit: 3 },
    });

    expect(result.users).toHaveLength(3);
    expect(result.nextCursor).toBe(3);
  });

  it("returns empty users array and null nextCursor when no results found", async () => {
    mockSearchByTeamIdAndEmailPrefix.mockResolvedValue([]);

    const result = await searchUsersByEmailHandler({
      input: { teamId: TEAM_ID, query: "zzz", cursor: null, limit: 10 },
    });

    expect(result.users).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("passes teamId and cursor to repository", async () => {
    mockSearchByTeamIdAndEmailPrefix.mockResolvedValue([]);

    await searchUsersByEmailHandler({
      input: { teamId: TEAM_ID, query: "carol", cursor: 42, limit: 10 },
    });

    expect(mockSearchByTeamIdAndEmailPrefix).toHaveBeenCalledWith({
      teamId: TEAM_ID,
      emailPrefix: "carol",
      cursor: 42,
      limit: 10,
    });
  });
});
