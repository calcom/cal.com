import { describe, expect, it, beforeEach, vi } from "vitest";

import type { PrismaClient } from "@calcom/prisma";

import { bulkUpdateEventsToDefaultLocation } from "./bulkUpdateEventsToDefaultLocation";

vi.mock("../utils", () => ({
  getAppFromSlug: vi.fn((slug: string) => {
    if (slug === "google-meet") {
      return {
        slug: "google-meet",
        appData: {
          location: {
            type: "integrations:google:meet",
          },
        },
      };
    }
    if (slug === "zoom") {
      return {
        slug: "zoom",
        appData: {
          location: {
            type: "integrations:zoom",
          },
        },
      };
    }
    return null;
  }),
}));

type MockPrisma = {
  credential: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  eventType: {
    findMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};

const createMockPrisma = (): MockPrisma => ({
  credential: {
    findFirst: vi.fn(),
  },
  eventType: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
});

describe("bulkUpdateEventsToDefaultLocation", () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    vi.clearAllMocks();
  });

  it("should throw error when default conferencing app is not set", async () => {
    const user = {
      id: 1,
      metadata: {},
    };

    await expect(
      bulkUpdateEventsToDefaultLocation({
        eventTypeIds: [1, 2],
        user,
        prisma: mockPrisma as unknown as PrismaClient,
      })
    ).rejects.toThrow("Default conferencing app not set");
  });

  it("should throw error when default conferencing app doesn't exist", async () => {
    const user = {
      id: 1,
      metadata: {
        defaultConferencingApp: {
          appSlug: "non-existent-app",
          appLink: "https://example.com",
        },
      },
    };

    await expect(
      bulkUpdateEventsToDefaultLocation({
        eventTypeIds: [1, 2],
        user,
        prisma: mockPrisma as unknown as PrismaClient,
      })
    ).rejects.toThrow("Default conferencing app 'non-existent-app' doesnt exist.");
  });

  it("should update event types that are not child managed events", async () => {
    const user = {
      id: 1,
      metadata: {
        defaultConferencingApp: {
          appSlug: "google-meet",
          appLink: "https://meet.google.com",
        },
      },
    };

    const credential = { id: 100 };
    const eventTypes = [
      { id: 1, parentId: null, metadata: {} },
      { id: 2, parentId: null, metadata: {} },
    ];

    mockPrisma.credential.findFirst.mockResolvedValue(credential);
    mockPrisma.eventType.findMany.mockResolvedValue(eventTypes);
    mockPrisma.eventType.updateMany.mockResolvedValue({ count: 2 });

    const result = await bulkUpdateEventsToDefaultLocation({
      eventTypeIds: [1, 2],
      user,
      prisma: mockPrisma as unknown as PrismaClient,
    });

    expect(result.count).toBe(2);
    expect(mockPrisma.eventType.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [1, 2],
        },
        userId: 1,
      },
      data: {
        locations: [
          {
            type: "integrations:google:meet",
            link: "https://meet.google.com",
            credentialId: 100,
          },
        ],
      },
    });
  });

  it("should filter out child managed event types with locked locations", async () => {
    const user = {
      id: 1,
      metadata: {
        defaultConferencingApp: {
          appSlug: "zoom",
          appLink: "https://zoom.us",
        },
      },
    };

    const credential = { id: 200 };
    const eventTypes = [
      { id: 1, parentId: null, metadata: {} },
      {
        id: 2,
        parentId: 100,
        metadata: {
          managedEventConfig: {
            unlockedFields: {},
          },
        },
      },
      {
        id: 3,
        parentId: 100,
        metadata: {
          managedEventConfig: {
            unlockedFields: {
              locations: true, // unlocked
            },
          },
        },
      },
    ];

    mockPrisma.credential.findFirst.mockResolvedValue(credential);
    mockPrisma.eventType.findMany.mockResolvedValue(eventTypes);
    mockPrisma.eventType.updateMany.mockResolvedValue({ count: 2 });

    const result = await bulkUpdateEventsToDefaultLocation({
      eventTypeIds: [1, 2, 3],
      user,
      prisma: mockPrisma as unknown as PrismaClient,
    });

    expect(result.count).toBe(2);
    expect(mockPrisma.eventType.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [1, 3],
        },
        userId: 1,
      },
      data: {
        locations: [
          {
            type: "integrations:zoom",
            link: "https://zoom.us",
            credentialId: 200,
          },
        ],
      },
    });
  });

  it("should return count 0 when all event types have locked locations", async () => {
    const user = {
      id: 1,
      metadata: {
        defaultConferencingApp: {
          appSlug: "google-meet",
          appLink: "https://meet.google.com",
        },
      },
    };

    const credential = { id: 300 };
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
      {
        id: 2,
        parentId: 100,
        metadata: {
          managedEventConfig: {
            unlockedFields: {
              locations: false, // explicitly locked
            },
          },
        },
      },
    ];

    mockPrisma.credential.findFirst.mockResolvedValue(credential);
    mockPrisma.eventType.findMany.mockResolvedValue(eventTypes);

    const result = await bulkUpdateEventsToDefaultLocation({
      eventTypeIds: [1, 2],
      user,
      prisma: mockPrisma as unknown as PrismaClient,
    });

    expect(result.count).toBe(0);
    expect(mockPrisma.eventType.updateMany).not.toHaveBeenCalled();
  });

  it("should work without credential when credential is not found", async () => {
    const user = {
      id: 1,
      metadata: {
        defaultConferencingApp: {
          appSlug: "google-meet",
          appLink: "https://meet.google.com",
        },
      },
    };

    const eventTypes = [{ id: 1, parentId: null, metadata: {} }];

    mockPrisma.credential.findFirst.mockResolvedValue(null);
    mockPrisma.eventType.findMany.mockResolvedValue(eventTypes);
    mockPrisma.eventType.updateMany.mockResolvedValue({ count: 1 });

    const result = await bulkUpdateEventsToDefaultLocation({
      eventTypeIds: [1],
      user,
      prisma: mockPrisma as unknown as PrismaClient,
    });

    expect(result.count).toBe(1);
    expect(mockPrisma.eventType.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [1],
        },
        userId: 1,
      },
      data: {
        locations: [
          {
            type: "integrations:google:meet",
            link: "https://meet.google.com",
            credentialId: undefined,
          },
        ],
      },
    });
  });

  it("should only query event types belonging to the user", async () => {
    const user = {
      id: 5,
      metadata: {
        defaultConferencingApp: {
          appSlug: "zoom",
          appLink: "https://zoom.us",
        },
      },
    };

    const credential = { id: 400 };
    const eventTypes = [{ id: 10, parentId: null, metadata: {} }];

    mockPrisma.credential.findFirst.mockResolvedValue(credential);
    mockPrisma.eventType.findMany.mockResolvedValue(eventTypes);
    mockPrisma.eventType.updateMany.mockResolvedValue({ count: 1 });

    await bulkUpdateEventsToDefaultLocation({
      eventTypeIds: [10, 11, 12],
      user,
      prisma: mockPrisma as unknown as PrismaClient,
    });

    expect(mockPrisma.eventType.findMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [10, 11, 12],
        },
        userId: 5,
      },
      select: {
        id: true,
        metadata: true,
        parentId: true,
      },
    });

    expect(mockPrisma.eventType.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 5,
        }),
      })
    );
  });
});
