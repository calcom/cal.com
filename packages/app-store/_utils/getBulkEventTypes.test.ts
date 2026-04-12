import { describe, expect, it, beforeEach, vi } from "vitest";

import type { Prisma } from "@calcom/prisma/client";

import { filterEventTypesWhereLocationUpdateIsAllowed, getBulkUserEventTypes } from "./getBulkEventTypes";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    eventType: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../utils", () => ({
  getAppFromLocationValue: vi.fn((locationType: string) => {
    if (locationType === "integrations:daily") {
      return { logo: "/daily-logo.svg" };
    }
    if (locationType === "integrations:google:meet") {
      return { logo: "/google-meet-logo.svg" };
    }
    return { logo: "/default-logo.svg" };
  }),
}));

import { prisma } from "@calcom/prisma";

describe("filterEventTypesWhereLocationUpdateIsAllowed", () => {
  it("should allow location updates for event types without a parent", () => {
    const eventTypes = [
      {
        id: 1,
        parentId: null,
        metadata: {},
      },
      {
        id: 2,
        parentId: null,
        metadata: null,
      },
    ];

    const result = filterEventTypesWhereLocationUpdateIsAllowed(eventTypes);
    expect(result).toHaveLength(2);
    expect(result).toEqual(eventTypes);
  });

  it("should allow location updates for child event types with unlocked locations", () => {
    const eventTypes = [
      {
        id: 1,
        parentId: 100,
        metadata: {
          managedEventConfig: {
            unlockedFields: {
              locations: true,
            },
          },
        },
      },
    ];

    const result = filterEventTypesWhereLocationUpdateIsAllowed(eventTypes);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("should block location updates for child event types with locked locations (locations field undefined)", () => {
    const eventTypes = [
      {
        id: 1,
        parentId: 100,
        metadata: {
          managedEventConfig: {
            unlockedFields: {},
          },
        },
      },
    ];

    const result = filterEventTypesWhereLocationUpdateIsAllowed(eventTypes);
    expect(result).toHaveLength(0);
  });

  it("should block location updates for child event types with explicitly locked locations (locations: false)", () => {
    const eventTypes = [
      {
        id: 1,
        parentId: 100,
        metadata: {
          managedEventConfig: {
            unlockedFields: {
              locations: false,
            },
          },
        },
      },
    ];

    const result = filterEventTypesWhereLocationUpdateIsAllowed(eventTypes);
    expect(result).toHaveLength(0);
  });

  it("should allow location updates for child event types without managedEventConfig", () => {
    const eventTypes = [
      {
        id: 1,
        parentId: 100,
        metadata: {},
      },
    ];

    const result = filterEventTypesWhereLocationUpdateIsAllowed(eventTypes);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("should allow location updates for child event types with invalid metadata", () => {
    const eventTypes = [
      {
        id: 1,
        parentId: 100,
        metadata: "invalid metadata",
      },
    ];

    const result = filterEventTypesWhereLocationUpdateIsAllowed(eventTypes);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("should handle mixed scenarios correctly", () => {
    const eventTypes = [
      {
        id: 1,
        parentId: null,
        metadata: {},
      },
      {
        id: 2,
        parentId: 100,
        metadata: {
          managedEventConfig: {
            unlockedFields: {
              locations: true,
            },
          },
        },
      },
      {
        id: 3,
        parentId: 100,
        metadata: {
          managedEventConfig: {
            unlockedFields: {},
          },
        },
      },
      {
        id: 4,
        parentId: 100,
        metadata: {
          managedEventConfig: {
            unlockedFields: {
              locations: false,
            },
          },
        },
      },
      {
        id: 5,
        parentId: 100,
        metadata: null,
      },
    ];

    const result = filterEventTypesWhereLocationUpdateIsAllowed(eventTypes);
    expect(result).toHaveLength(3);
    expect(result.map((et) => et.id)).toEqual([1, 2, 5]);
  });

  it("should preserve all properties of filtered event types", () => {
    const eventTypes = [
      {
        id: 1,
        parentId: null,
        metadata: {},
        title: "Test Event",
        locations: [{ type: "integrations:daily" }],
      },
    ];

    const result = filterEventTypesWhereLocationUpdateIsAllowed(eventTypes);
    expect(result[0]).toEqual(eventTypes[0]);
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("locations");
  });
});

describe("getBulkUserEventTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return user event types with logos and filter out locked child events", async () => {
    const userId = 1;
    const mockEventTypes = [
      {
        id: 1,
        title: "Regular Event",
        locations: [{ type: "integrations:daily" }] as Prisma.JsonValue,
        metadata: {} as Prisma.JsonValue,
        parentId: null,
      },
      {
        id: 2,
        title: "Child Event - Unlocked",
        locations: [{ type: "integrations:google:meet" }] as Prisma.JsonValue,
        metadata: {
          managedEventConfig: {
            unlockedFields: {
              locations: true,
            },
          },
        } as Prisma.JsonValue,
        parentId: 100,
      },
      {
        id: 3,
        title: "Child Event - Locked",
        locations: [{ type: "integrations:daily" }] as Prisma.JsonValue,
        metadata: {
          managedEventConfig: {
            unlockedFields: {},
          },
        } as Prisma.JsonValue,
        parentId: 100,
      },
    ];

    vi.mocked(prisma.eventType.findMany).mockResolvedValue(
      mockEventTypes as unknown as Awaited<ReturnType<typeof prisma.eventType.findMany>>
    );

    const result = await getBulkUserEventTypes(userId);

    expect(result.eventTypes).toHaveLength(2);
    expect(result.eventTypes[0].id).toBe(1);
    expect(result.eventTypes[0].title).toBe("Regular Event");
    expect(result.eventTypes[0].logo).toBe("/daily-logo.svg");
    expect(result.eventTypes[1].id).toBe(2);
    expect(result.eventTypes[1].title).toBe("Child Event - Unlocked");
    expect(result.eventTypes[1].logo).toBe("/google-meet-logo.svg");

    expect(prisma.eventType.findMany).toHaveBeenCalledWith({
      where: {
        userId: userId,
        teamId: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        length: true,
        slug: true,
        locations: true,
        metadata: true,
        parentId: true,
      },
    });
  });

  it("should return all event types when none have locked locations", async () => {
    const userId = 2;
    const mockEventTypes = [
      {
        id: 10,
        title: "Event 1",
        locations: [{ type: "integrations:daily" }] as Prisma.JsonValue,
        metadata: {} as Prisma.JsonValue,
        parentId: null,
      },
      {
        id: 11,
        title: "Event 2",
        locations: [{ type: "integrations:daily" }] as Prisma.JsonValue,
        metadata: {} as Prisma.JsonValue,
        parentId: null,
      },
    ];

    vi.mocked(prisma.eventType.findMany).mockResolvedValue(
      mockEventTypes as unknown as Awaited<ReturnType<typeof prisma.eventType.findMany>>
    );

    const result = await getBulkUserEventTypes(userId);

    expect(result.eventTypes).toHaveLength(2);
    expect(result.eventTypes.map((et) => et.id)).toEqual([10, 11]);
  });

  it("should return empty array when all event types have locked locations", async () => {
    const userId = 3;
    const mockEventTypes = [
      {
        id: 20,
        title: "Locked Event 1",
        locations: [{ type: "integrations:daily" }] as Prisma.JsonValue,
        metadata: {
          managedEventConfig: {
            unlockedFields: {},
          },
        } as Prisma.JsonValue,
        parentId: 100,
      },
      {
        id: 21,
        title: "Locked Event 2",
        locations: [{ type: "integrations:daily" }] as Prisma.JsonValue,
        metadata: {
          managedEventConfig: {
            unlockedFields: {
              locations: false,
            },
          },
        } as Prisma.JsonValue,
        parentId: 100,
      },
    ];

    vi.mocked(prisma.eventType.findMany).mockResolvedValue(
      mockEventTypes as unknown as Awaited<ReturnType<typeof prisma.eventType.findMany>>
    );

    const result = await getBulkUserEventTypes(userId);

    expect(result.eventTypes).toHaveLength(0);
  });

  it("should handle event types with null locations gracefully", async () => {
    const userId = 4;
    const mockEventTypes = [
      {
        id: 30,
        title: "Event with null location",
        locations: null as unknown as Prisma.JsonValue,
        metadata: {} as Prisma.JsonValue,
        parentId: null,
      },
    ];

    vi.mocked(prisma.eventType.findMany).mockResolvedValue(
      mockEventTypes as unknown as Awaited<ReturnType<typeof prisma.eventType.findMany>>
    );

    const result = await getBulkUserEventTypes(userId);

    expect(result.eventTypes).toHaveLength(1);
    expect(result.eventTypes[0].id).toBe(30);
    expect(result.eventTypes[0].logo).toBe("/daily-logo.svg");
  });
});
