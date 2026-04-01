import { describe, it, expect, vi, beforeEach } from "vitest";

import { mapEventTypes } from "../util";

const mockEnrichUsersWithTheirProfiles = vi.fn();

// Mock dependencies - use a class so `new UserRepository(prisma)` works
vi.mock("@calcom/features/users/repositories/UserRepository", () => {
  return {
    UserRepository: class {
      enrichUsersWithTheirProfiles = mockEnrichUsersWithTheirProfiles;
    },
  };
});
vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

type MockEventType = Parameters<typeof mapEventTypes>[0][number];

function createMockUser(id: number, username: string) {
  return { id, username, name: `User ${id}`, avatarUrl: null, timeZone: "UTC" };
}

function createMockEventType(overrides: Partial<MockEventType> = {}): MockEventType {
  return {
    id: 1,
    title: "Test Event",
    slug: "test-event",
    description: "A test event",
    length: 30,
    hidden: false,
    schedulingType: null,
    metadata: null,
    position: 0,
    teamId: null,
    userId: 1,
    parentId: null,
    eventTypeColor: null,
    recurringEvent: null,
    requiresConfirmation: false,
    seatsPerTimeSlot: null,
    owner: { timeZone: "UTC" },
    hashedLink: [],
    users: [createMockUser(1, "user1")],
    children: [],
    hosts: [],
    team: null,
    ...overrides,
  } as unknown as MockEventType;
}

describe("mapEventTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockEnrichUsersWithTheirProfiles.mockImplementation((users: Array<{ id: number; username: string | null }>) =>
      users.map((u) => ({
        ...u,
        nonProfileUsername: u.username,
        profile: { upId: `up-${u.id}`, username: u.username },
      }))
    );
  });

  it("should call enrichUsersWithTheirProfiles exactly once for multiple event types", async () => {
    const eventTypes = [
      createMockEventType({ id: 1, users: [createMockUser(1, "user1"), createMockUser(2, "user2")] }),
      createMockEventType({ id: 2, users: [createMockUser(3, "user3")] }),
    ];

    await mapEventTypes(eventTypes as unknown as Parameters<typeof mapEventTypes>[0]);

    // Should be called exactly once with all unique users batched together
    expect(mockEnrichUsersWithTheirProfiles).toHaveBeenCalledTimes(1);
    expect(mockEnrichUsersWithTheirProfiles).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 2 }),
        expect.objectContaining({ id: 3 }),
      ])
    );
  });

  it("should deduplicate users shared across event types", async () => {
    const sharedUser = createMockUser(1, "shared");
    const eventTypes = [
      createMockEventType({ id: 1, users: [sharedUser, createMockUser(2, "user2")] }),
      createMockEventType({ id: 2, users: [sharedUser, createMockUser(3, "user3")] }),
    ];

    await mapEventTypes(eventTypes as unknown as Parameters<typeof mapEventTypes>[0]);

    // User 1 appears in both event types but should only be enriched once
    const enrichedUsers = mockEnrichUsersWithTheirProfiles.mock.calls[0][0];
    const userIds = enrichedUsers.map((u: { id: number }) => u.id);
    expect(userIds).toEqual([1, 2, 3]); // No duplicates
  });

  it("should use hosts when hosts are present instead of users", async () => {
    const eventTypes = [
      createMockEventType({
        id: 1,
        users: [createMockUser(99, "should-not-use")],
        hosts: [
          { user: createMockUser(10, "host1") },
          { user: createMockUser(11, "host2") },
        ] as MockEventType["hosts"],
      }),
    ];

    await mapEventTypes(eventTypes as unknown as Parameters<typeof mapEventTypes>[0]);

    const enrichedUsers = mockEnrichUsersWithTheirProfiles.mock.calls[0][0];
    const userIds = enrichedUsers.map((u: { id: number }) => u.id);
    expect(userIds).toEqual([10, 11]); // Uses hosts, not users
    expect(userIds).not.toContain(99);
  });

  it("should include children users in the batch", async () => {
    const eventTypes = [
      createMockEventType({
        id: 1,
        users: [createMockUser(1, "parent-user")],
        children: [
          {
            id: 100,
            users: [createMockUser(20, "child-user1"), createMockUser(21, "child-user2")],
          },
        ] as MockEventType["children"],
      }),
    ];

    await mapEventTypes(eventTypes as unknown as Parameters<typeof mapEventTypes>[0]);

    const enrichedUsers = mockEnrichUsersWithTheirProfiles.mock.calls[0][0];
    const userIds = enrichedUsers.map((u: { id: number }) => u.id);
    expect(userIds).toContain(1);
    expect(userIds).toContain(20);
    expect(userIds).toContain(21);
  });

  it("should return empty array for empty input", async () => {
    const result = await mapEventTypes([] as unknown as Parameters<typeof mapEventTypes>[0]);
    expect(result).toEqual([]);
    // Should still be called once with empty array
    expect(mockEnrichUsersWithTheirProfiles).toHaveBeenCalledTimes(1);
    expect(mockEnrichUsersWithTheirProfiles).toHaveBeenCalledWith([]);
  });

  it("should parse metadata with EventTypeMetaDataSchema", async () => {
    const eventTypes = [
      createMockEventType({
        id: 1,
        metadata: { managedEventConfig: { unlockedFields: {} } },
      }),
    ];

    const result = await mapEventTypes(eventTypes as unknown as Parameters<typeof mapEventTypes>[0]);

    expect(result[0].metadata).toBeDefined();
    expect(result[0].metadata).toHaveProperty("managedEventConfig");
  });

  it("should set metadata to null when event type has no metadata", async () => {
    const eventTypes = [createMockEventType({ id: 1, metadata: null })];

    const result = await mapEventTypes(eventTypes as unknown as Parameters<typeof mapEventTypes>[0]);

    expect(result[0].metadata).toBeNull();
  });

  it("should generate descriptionAsSafeHTML from description", async () => {
    const eventTypes = [createMockEventType({ id: 1, description: "**bold text**" })];

    const result = await mapEventTypes(eventTypes as unknown as Parameters<typeof mapEventTypes>[0]);

    expect(result[0].safeDescription).toBeDefined();
    expect(result[0].descriptionAsSafeHTML).toBeDefined();
    expect(result[0].safeDescription).toContain("bold text");
    expect(result[0].descriptionAsSafeHTML).toContain("bold text");
  });

  it("should set descriptionAsSafeHTML to undefined when no description", async () => {
    const eventTypes = [createMockEventType({ id: 1, description: null })];

    const result = await mapEventTypes(
      eventTypes as unknown as Parameters<typeof mapEventTypes>[0]
    );

    expect(result[0].safeDescription).toBeUndefined();
    expect(result[0].descriptionAsSafeHTML).toBeUndefined();
  });

  it("should preserve all original event type fields", async () => {
    const eventTypes = [
      createMockEventType({
        id: 42,
        title: "My Event",
        slug: "my-event",
        teamId: 10,
        hidden: true,
      }),
    ];

    const result = await mapEventTypes(eventTypes as unknown as Parameters<typeof mapEventTypes>[0]);

    expect(result[0].id).toBe(42);
    expect(result[0].title).toBe("My Event");
    expect(result[0].slug).toBe("my-event");
    expect(result[0].teamId).toBe(10);
    expect(result[0].hidden).toBe(true);
  });

  it("should fallback to a personal profile when batch enrichment misses a user", async () => {
    mockEnrichUsersWithTheirProfiles.mockImplementation((users: Array<{ id: number; username: string | null }>) =>
      users
        .filter((user) => user.id !== 2)
        .map((u) => ({
          ...u,
          nonProfileUsername: u.username,
          profile: { upId: `up-${u.id}`, username: u.username },
        }))
    );

    const eventTypes = [
      createMockEventType({
        users: [createMockUser(1, "user1"), createMockUser(2, "user2")],
        children: [
          {
            id: 100,
            users: [createMockUser(2, "user2"), createMockUser(3, "user3")],
          },
        ] as MockEventType["children"],
      }),
    ];

    const result = await mapEventTypes(eventTypes as unknown as Parameters<typeof mapEventTypes>[0]);

    expect(result[0].users.map((user) => user.id)).toEqual([1, 2]);
    expect(result[0].users[1].profile.username).toBe("user2");
    expect(result[0].children[0].users.map((user) => user.id)).toEqual([2, 3]);
    expect(result[0].children[0].users[0].profile.username).toBe("user2");
  });
});
