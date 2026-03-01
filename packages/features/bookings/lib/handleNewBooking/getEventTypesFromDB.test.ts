import { ErrorCode } from "@calcom/lib/errorCodes";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUniqueOrThrow = vi.fn();
vi.mock("@calcom/prisma", () => ({
  prisma: {
    eventType: {
      findUniqueOrThrow: (...args: unknown[]) => mockFindUniqueOrThrow(...args),
    },
  },
}));

vi.mock("@calcom/prisma/zod-utils", () => ({
  EventTypeMetaDataSchema: { parse: (v: unknown) => v || {} },
  customInputSchema: { array: () => ({ parse: (v: unknown) => v || [] }) },
  rrSegmentQueryValueSchema: { parse: (v: unknown) => v ?? null },
}));

vi.mock("@calcom/lib/isRecurringEvent", () => ({
  parseRecurringEvent: (v: unknown) => v || null,
}));

vi.mock("@calcom/features/bookings/lib/getBookingFields", () => ({
  getBookingFieldsWithSystemFields: vi.fn().mockReturnValue([]),
}));

vi.mock("@calcom/features/users/repositories/UserRepository", () => ({
  withSelectedCalendars: (user: Record<string, unknown>) => ({
    ...user,
    userLevelSelectedCalendars: [],
    allSelectedCalendars: [],
  }),
}));

vi.mock("@calcom/ee/workflows/lib/getAllWorkflows", () => ({
  workflowSelect: { id: true },
}));

vi.mock("@calcom/prisma/selects/credential", () => ({
  credentialForCalendarServiceSelect: { id: true, type: true },
}));

vi.mock("@calcom/prisma/selects/user", () => ({
  userSelect: { id: true, name: true, email: true, username: true },
}));

import { getEventTypesFromDB } from "./getEventTypesFromDB";

describe("getEventTypesFromDB", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns transformed event type with parsed metadata", async () => {
    const rawEventType = {
      id: 1,
      title: "Test Event",
      metadata: { key: "value" },
      recurringEvent: null,
      customInputs: [],
      locations: [{ type: "integrations:daily" }],
      profile: { organizationId: null },
      hosts: [],
      users: [],
      team: null,
      bookingFields: [],
      hostGroups: [],
      rrSegmentQueryValue: null,
    };
    mockFindUniqueOrThrow.mockResolvedValue(rawEventType);

    const result = await getEventTypesFromDB(1);

    expect(result.id).toBe(1);
    expect(result.metadata).toEqual({ key: "value" });
    expect(result.isDynamic).toBe(false);
    expect(mockFindUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 1 },
      select: expect.objectContaining({ id: true, title: true }),
    });
  });

  it("transforms hosts with selectedCalendars", async () => {
    const rawEventType = {
      id: 2,
      title: "Team Event",
      metadata: {},
      recurringEvent: null,
      customInputs: [],
      locations: [],
      profile: { organizationId: 10 },
      hosts: [
        {
          user: { id: 1, name: "Host 1" },
          isFixed: true,
          priority: 1,
          weight: 100,
          createdAt: new Date(),
          groupId: null,
          location: null,
          schedule: null,
        },
      ],
      users: [{ id: 2, name: "User 1" }],
      team: { id: 5, parentId: 10 },
      bookingFields: [],
      hostGroups: [],
      rrSegmentQueryValue: null,
    };
    mockFindUniqueOrThrow.mockResolvedValue(rawEventType);

    const result = await getEventTypesFromDB(2);

    expect(result.hosts[0].user).toHaveProperty("allSelectedCalendars");
    expect(result.users[0]).toHaveProperty("allSelectedCalendars");
  });

  it("parses locations as LocationObject array", async () => {
    const rawEventType = {
      id: 3,
      title: "Location Event",
      metadata: {},
      recurringEvent: null,
      customInputs: [],
      locations: [{ type: "inPerson", address: "123 Main St" }],
      profile: null,
      hosts: [],
      users: [],
      team: null,
      bookingFields: [],
      hostGroups: [],
      rrSegmentQueryValue: null,
    };
    mockFindUniqueOrThrow.mockResolvedValue(rawEventType);

    const result = await getEventTypesFromDB(3);

    expect(result.locations).toEqual([{ type: "inPerson", address: "123 Main St" }]);
  });

  it("returns empty locations when locations is null", async () => {
    const rawEventType = {
      id: 4,
      title: "No Location Event",
      metadata: {},
      recurringEvent: null,
      customInputs: [],
      locations: null,
      profile: null,
      hosts: [],
      users: [],
      team: null,
      bookingFields: [],
      hostGroups: [],
      rrSegmentQueryValue: null,
    };
    mockFindUniqueOrThrow.mockResolvedValue(rawEventType);

    const result = await getEventTypesFromDB(4);

    expect(result.locations).toEqual([]);
  });

  it("sets isDynamic to false", async () => {
    const rawEventType = {
      id: 5,
      title: "Dynamic Check",
      metadata: {},
      recurringEvent: null,
      customInputs: [],
      locations: [],
      profile: null,
      hosts: [],
      users: [],
      team: null,
      bookingFields: [],
      hostGroups: [],
      rrSegmentQueryValue: null,
    };
    mockFindUniqueOrThrow.mockResolvedValue(rawEventType);

    const result = await getEventTypesFromDB(5);

    expect(result.isDynamic).toBe(false);
  });

  it("returns hostGroups from event type", async () => {
    const rawEventType = {
      id: 6,
      title: "Host Groups Event",
      metadata: {},
      recurringEvent: null,
      customInputs: [],
      locations: [],
      profile: null,
      hosts: [],
      users: [],
      team: null,
      bookingFields: [],
      hostGroups: [{ id: 1, name: "Group A" }],
      rrSegmentQueryValue: null,
    };
    mockFindUniqueOrThrow.mockResolvedValue(rawEventType);

    const result = await getEventTypesFromDB(6);

    expect(result.hostGroups).toEqual([{ id: 1, name: "Group A" }]);
  });
});
