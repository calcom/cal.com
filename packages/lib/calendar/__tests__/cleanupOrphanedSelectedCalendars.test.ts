import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, test, vi, beforeEach } from "vitest";

import { cleanupOrphanedSelectedCalendars } from "../cleanupOrphanedSelectedCalendars";
import type { UserWithCalendars } from "../cleanupOrphanedSelectedCalendars";

vi.mock("@calcom/prisma", () => ({
  default: {
    selectedCalendar: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe("cleanupOrphanedSelectedCalendars", () => {
  const mockUser: UserWithCalendars = {
    id: 1,
    email: "test@example.com",
    allSelectedCalendars: [],
    userLevelSelectedCalendars: [],
    destinationCalendar: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return early if no connected calendars", async () => {
    const connectedCalendars = [];

    const prisma = (await import("@calcom/prisma")).default;

    await cleanupOrphanedSelectedCalendars({
      user: mockUser,
      connectedCalendars,
    });

    expect(prisma.selectedCalendar.deleteMany).not.toHaveBeenCalled();
  });

  test("should cleanup orphaned calendars for Google Calendar", async () => {
    const connectedCalendars = [
      {
        integration: { slug: "google_calendar" },
        calendars: [
          { externalId: "calendar1@gmail.com", integration: "google_calendar" },
          { externalId: "calendar2@gmail.com", integration: "google_calendar" },
        ],
      },
    ];

    const mockSelectedCalendars = [
      { id: "1", externalId: "calendar1@gmail.com" },
      { id: "2", externalId: "calendar2@gmail.com" },
      { id: "3", externalId: "orphaned@gmail.com" },
    ];

    const prisma = (await import("@calcom/prisma")).default;
    vi.mocked(prisma.selectedCalendar.findMany).mockResolvedValue(mockSelectedCalendars);
    vi.mocked(prisma.selectedCalendar.deleteMany).mockResolvedValue({ count: 1 });

    await cleanupOrphanedSelectedCalendars({
      user: mockUser,
      connectedCalendars,
    });

    expect(prisma.selectedCalendar.findMany).toHaveBeenCalledWith({
      where: { userId: mockUser.id },
      select: { id: true, externalId: true },
    });

    expect(prisma.selectedCalendar.deleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["3"],
        },
      },
    });
  });

  test("should cleanup orphaned calendars for Office365", async () => {
    const connectedCalendars = [
      {
        integration: { slug: "office365_calendar" },
        calendars: [{ externalId: "calendar1@outlook.com", integration: "office365_calendar" }],
      },
    ];

    const mockSelectedCalendars = [
      { id: "1", externalId: "calendar1@outlook.com" },
      { id: "2", externalId: "orphaned@outlook.com" },
    ];

    const prisma = (await import("@calcom/prisma")).default;
    vi.mocked(prisma.selectedCalendar.findMany).mockResolvedValue(mockSelectedCalendars);
    vi.mocked(prisma.selectedCalendar.deleteMany).mockResolvedValue({ count: 1 });

    await cleanupOrphanedSelectedCalendars({
      user: mockUser,
      connectedCalendars,
    });

    expect(prisma.selectedCalendar.deleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["2"],
        },
      },
    });
  });

  test("should handle multiple calendar providers", async () => {
    const connectedCalendars = [
      {
        integration: { slug: "google_calendar" },
        calendars: [{ externalId: "google@gmail.com", integration: "google_calendar" }],
      },
      {
        integration: { slug: "office365_calendar" },
        calendars: [{ externalId: "office@outlook.com", integration: "office365_calendar" }],
      },
    ];

    const mockSelectedCalendars = [
      { id: "1", externalId: "google@gmail.com" },
      { id: "2", externalId: "office@outlook.com" },
      { id: "3", externalId: "orphaned@gmail.com" },
      { id: "4", externalId: "orphaned@outlook.com" },
    ];

    const prisma = (await import("@calcom/prisma")).default;
    vi.mocked(prisma.selectedCalendar.findMany).mockResolvedValue(mockSelectedCalendars);
    vi.mocked(prisma.selectedCalendar.deleteMany).mockResolvedValue({ count: 2 });

    await cleanupOrphanedSelectedCalendars({
      user: mockUser,
      connectedCalendars,
    });

    expect(prisma.selectedCalendar.deleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["3", "4"],
        },
      },
    });
  });

  test("should not delete anything if no orphaned calendars", async () => {
    const connectedCalendars = [
      {
        integration: { slug: "google_calendar" },
        calendars: [
          { externalId: "calendar1@gmail.com", integration: "google_calendar" },
          { externalId: "calendar2@gmail.com", integration: "google_calendar" },
        ],
      },
    ];

    const mockSelectedCalendars = [
      { id: "1", externalId: "calendar1@gmail.com" },
      { id: "2", externalId: "calendar2@gmail.com" },
    ];

    const prisma = (await import("@calcom/prisma")).default;
    vi.mocked(prisma.selectedCalendar.findMany).mockResolvedValue(mockSelectedCalendars);

    await cleanupOrphanedSelectedCalendars({
      user: mockUser,
      connectedCalendars,
    });

    expect(prisma.selectedCalendar.deleteMany).not.toHaveBeenCalled();
  });

  test("should handle errors gracefully", async () => {
    const connectedCalendars = [
      {
        integration: { slug: "google_calendar" },
        calendars: [{ externalId: "calendar1@gmail.com", integration: "google_calendar" }],
      },
    ];

    const prisma = (await import("@calcom/prisma")).default;
    vi.mocked(prisma.selectedCalendar.findMany).mockRejectedValue(new Error("Database error"));

    await expect(
      cleanupOrphanedSelectedCalendars({
        user: mockUser,
        connectedCalendars,
      })
    ).resolves.not.toThrow();
  });
});
